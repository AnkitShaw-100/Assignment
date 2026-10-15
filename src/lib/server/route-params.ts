import "server-only";
import { leadIdSchema } from "@/lib/leads/validation";
import { HttpError } from "./errors";

/** Reads and validates the `[id]` segment of a lead route. */
export async function leadIdFrom(ctx: { params: Promise<{ id: string }> }): Promise<string> {
  const { id } = await ctx.params;
  if (!leadIdSchema.safeParse(id).success) {
    throw new HttpError(400, "INVALID_ID", "Lead id must be a valid UUID");
  }
  return id;
}
