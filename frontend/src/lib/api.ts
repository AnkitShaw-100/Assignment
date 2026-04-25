const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export function getApiBase() {
  return API_BASE;
}

export function buildHeaders(options?: {
  bearerToken?: string;
  includeJson?: boolean;
}) {
  const headers = new Headers();
  if (options?.includeJson !== false) {
    headers.set("Content-Type", "application/json");
  }
  if (options?.bearerToken?.trim()) {
    headers.set("Authorization", `Bearer ${options.bearerToken.trim()}`);
  }
  return headers;
}

export async function parseResponse<T = unknown>(
  response: Response,
): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMessage =
      typeof data?.message === "string" ? data.message : "Request failed";
    throw new Error(errorMessage);
  }

  return data as T;
}
