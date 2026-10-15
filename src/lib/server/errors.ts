import "server-only";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import type { ApiError } from "@/lib/leads/types";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Resource not found") {
    super(404, "NOT_FOUND", message);
  }
}

export class ConflictError extends HttpError {
  constructor(message: string) {
    super(409, "CONFLICT", message);
  }
}

export function validationError(error: z.ZodError): HttpError {
  const { formErrors, fieldErrors } = z.flattenError(error);
  const fields = Object.fromEntries(
    (Object.entries(fieldErrors) as [string, string[] | undefined][]).filter(
      (entry): entry is [string, string[]] => !!entry[1]?.length,
    ),
  );
  const message = formErrors[0] ?? Object.values(fields)[0]?.[0] ?? "Invalid request";
  return new HttpError(400, "VALIDATION_ERROR", message, Object.keys(fields).length ? fields : undefined);
}

export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    const body: ApiError = {
      error: { code: error.code, message: error.message, fieldErrors: error.fieldErrors },
    };
    return Response.json(body, { status: error.status });
  }
  // Log the full error server-side; never leak internals to the client.
  console.error("[api] unexpected error", error);
  const body: ApiError = {
    error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." },
  };
  return Response.json(body, { status: 500 });
}

/** Parses a JSON body and validates it, mapping failures to 400 responses. */
export async function parseBody<T extends z.ZodType>(request: Request, schema: T): Promise<z.output<T>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new HttpError(400, "INVALID_JSON", "Request body must be valid JSON");
  }
  const result = schema.safeParse(raw);
  if (!result.success) throw validationError(result.error);
  return result.data;
}

export function parseWith<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) throw validationError(result.error);
  return result.data;
}

/** Wraps a route handler so thrown errors become consistent JSON responses. */
export function handle<Args extends unknown[]>(fn: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (error) {
      // Let Next.js control-flow errors (e.g. prerender bail-outs) propagate.
      unstable_rethrow(error);
      return errorResponse(error);
    }
  };
}
