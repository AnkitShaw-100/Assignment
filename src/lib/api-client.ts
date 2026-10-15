import type { ApiError, Discussion, LeadDetail, LeadStats, LeadSummary } from "@/lib/leads/types";
import type { LeadStatus } from "@/lib/leads/status";

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { "content-type": "application/json", ...init?.headers },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiClientError("Network error. Check your connection and try again.", 0);
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const apiError = (body as ApiError | null)?.error;
    throw new ApiClientError(
      apiError?.message ?? `Request failed (${response.status})`,
      response.status,
      apiError?.fieldErrors,
    );
  }
  return (body as { data: T }).data;
}

export const api = {
  listLeads(filters: { status?: LeadStatus; q?: string }, signal?: AbortSignal) {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.q) params.set("q", filters.q);
    const qs = params.toString();
    return request<LeadSummary[]>(`/api/leads${qs ? `?${qs}` : ""}`, { signal });
  },
  stats(day: { start: Date; end: Date }, signal?: AbortSignal) {
    const params = new URLSearchParams({
      dayStart: day.start.toISOString(),
      dayEnd: day.end.toISOString(),
    });
    return request<LeadStats>(`/api/stats?${params}`, { signal });
  },
  getLead(id: string, signal?: AbortSignal) {
    return request<LeadDetail>(`/api/leads/${id}`, { signal });
  },
  createLead(input: { name: string; company?: string; phone?: string; status: LeadStatus }) {
    return request<LeadSummary>("/api/leads", { method: "POST", body: JSON.stringify(input) });
  },
  updateLead(id: string, input: { status?: LeadStatus; nextFollowUpAt?: string | null }) {
    return request<LeadSummary>(`/api/leads/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  },
  addDiscussion(id: string, input: { note: string; followUpAt?: string | null }) {
    return request<Discussion>(`/api/leads/${id}/discussions`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
