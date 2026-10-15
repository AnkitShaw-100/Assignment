import {
  differenceInCalendarDays,
  format,
  formatDistanceStrict,
  isSameDay,
  isValid,
  startOfDay,
} from "date-fns";
import type { LeadSummary } from "./types";

/**
 * Follow-up classification, always relative to the viewer's local calendar day:
 * - "overdue":  scheduled on a day before today
 * - "today":    scheduled at any time today (pinned; may already be past due)
 * - "upcoming": scheduled on a later day
 */
export type FollowUpState = "overdue" | "today" | "upcoming";

export function getFollowUpState(at: Date, now: Date): FollowUpState {
  if (at < startOfDay(now)) return "overdue";
  if (isSameDay(at, now)) return "today";
  return "upcoming";
}

/** True when the scheduled moment has passed (covers earlier-today follow-ups too). */
export function isPastDue(at: Date, now: Date): boolean {
  return at.getTime() < now.getTime();
}

function lastActivity(lead: LeadSummary): number {
  return new Date(lead.lastDiscussion?.createdAt ?? lead.createdAt).getTime();
}

const RANK: Record<FollowUpState | "none", number> = {
  today: 0,
  overdue: 1,
  upcoming: 2,
  none: 3,
};

/**
 * Splits leads into today's pinned follow-ups and everything else.
 * Order: today's (earliest first) → overdue (most overdue first) →
 * upcoming (soonest first) → no follow-up (most recent activity first).
 */
export function arrangeLeads(
  leads: LeadSummary[],
  now: Date,
): { pinned: LeadSummary[]; others: LeadSummary[] } {
  const ranked = leads.map((lead) => {
    const at = lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt) : null;
    const state: FollowUpState | "none" = at ? getFollowUpState(at, now) : "none";
    return { lead, at, state };
  });

  ranked.sort((a, b) => {
    const byRank = RANK[a.state] - RANK[b.state];
    if (byRank !== 0) return byRank;
    if (a.at && b.at && a.at.getTime() !== b.at.getTime()) {
      return a.at.getTime() - b.at.getTime();
    }
    const byActivity = lastActivity(b.lead) - lastActivity(a.lead);
    if (byActivity !== 0) return byActivity;
    return a.lead.name.localeCompare(b.lead.name);
  });

  return {
    pinned: ranked.filter((r) => r.state === "today").map((r) => r.lead),
    others: ranked.filter((r) => r.state !== "today").map((r) => r.lead),
  };
}

/** "just now", "2 hours ago", "3 days ago". */
export function timeAgo(date: Date, now: Date): string {
  if (Math.abs(now.getTime() - date.getTime()) < 60_000) return "just now";
  return formatDistanceStrict(date, now, { addSuffix: true });
}

/** Human label for a follow-up, e.g. "Today at 2:00 PM" or "Mon, Oct 20 at 9:30 AM". */
export function formatFollowUp(at: Date, now: Date): string {
  const time = format(at, "h:mm a");
  const days = differenceInCalendarDays(at, now);
  if (days === 0) return `Today at ${time}`;
  if (days === 1) return `Tomorrow at ${time}`;
  if (days === -1) return `Yesterday at ${time}`;
  const sameYear = at.getFullYear() === now.getFullYear();
  return `${format(at, sameYear ? "EEE, MMM d" : "MMM d, yyyy")} at ${time}`;
}

export const DEFAULT_FOLLOW_UP_TIME = "09:00";

/**
 * Combines a local date ("yyyy-MM-dd") and optional time ("HH:mm") from form
 * inputs into a UTC ISO string. Returns null when the date is empty.
 */
export function toFollowUpIso(date: string, time: string): string | null {
  if (!date) return null;
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = (time || DEFAULT_FOLLOW_UP_TIME).split(":").map(Number);
  const local = new Date(y, m - 1, d, hh, mm, 0, 0);
  return isValid(local) ? local.toISOString() : null;
}
