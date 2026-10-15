import type { LeadStatus } from "./status";

/** All timestamps are ISO-8601 strings in UTC. */
export type LeadSummary = {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  status: LeadStatus;
  nextFollowUpAt: string | null;
  lastDiscussion: { note: string; createdAt: string } | null;
  discussionCount: number;
  createdAt: string;
  updatedAt: string;
};

export type Discussion = {
  id: string;
  note: string;
  followUpAt: string | null;
  createdAt: string;
};

export type LeadDetail = Omit<LeadSummary, "lastDiscussion" | "discussionCount"> & {
  discussions: Discussion[];
};

export type LeadStats = {
  total: number;
  byStatus: Record<LeadStatus, number>;
  dueToday: number;
  overdue: number;
};

export type ApiError = {
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
  };
};
