import { describe, expect, it } from "vitest";
import {
  arrangeLeads,
  formatFollowUp,
  getFollowUpState,
  isPastDue,
  timeAgo,
  toFollowUpIso,
} from "@/lib/leads/follow-up";
import type { LeadSummary } from "@/lib/leads/types";

// Local-time constructors keep these tests independent of the machine's timezone.
const now = new Date(2026, 9, 15, 14, 0); // Oct 15 2026, 2:00 PM local

function lead(overrides: Partial<LeadSummary> & { id: string }): LeadSummary {
  return {
    name: overrides.id,
    company: null,
    phone: null,
    status: "NEW",
    nextFollowUpAt: null,
    lastDiscussion: null,
    discussionCount: 0,
    createdAt: new Date(2026, 9, 1).toISOString(),
    updatedAt: new Date(2026, 9, 1).toISOString(),
    ...overrides,
  };
}

describe("getFollowUpState", () => {
  it("classifies follow-ups later today as today", () => {
    expect(getFollowUpState(new Date(2026, 9, 15, 17, 0), now)).toBe("today");
  });

  it("classifies follow-ups earlier today as today (pinned), but past due", () => {
    const earlier = new Date(2026, 9, 15, 9, 0);
    expect(getFollowUpState(earlier, now)).toBe("today");
    expect(isPastDue(earlier, now)).toBe(true);
  });

  it("treats the first and last moments of today as today", () => {
    expect(getFollowUpState(new Date(2026, 9, 15, 0, 0, 0, 0), now)).toBe("today");
    expect(getFollowUpState(new Date(2026, 9, 15, 23, 59, 59, 999), now)).toBe("today");
  });

  it("classifies anything before today as overdue", () => {
    expect(getFollowUpState(new Date(2026, 9, 14, 23, 59), now)).toBe("overdue");
    expect(getFollowUpState(new Date(2026, 8, 1), now)).toBe("overdue");
  });

  it("classifies anything after today as upcoming", () => {
    expect(getFollowUpState(new Date(2026, 9, 16, 0, 0), now)).toBe("upcoming");
    expect(isPastDue(new Date(2026, 9, 16, 0, 0), now)).toBe(false);
  });
});

describe("arrangeLeads", () => {
  it("pins today's follow-ups and orders the rest by urgency, then activity", () => {
    const leads = [
      lead({ id: "none-old", createdAt: new Date(2026, 8, 1).toISOString() }),
      lead({ id: "upcoming-far", nextFollowUpAt: new Date(2026, 9, 25, 9).toISOString() }),
      lead({ id: "today-late", nextFollowUpAt: new Date(2026, 9, 15, 18).toISOString() }),
      lead({ id: "overdue-recent", nextFollowUpAt: new Date(2026, 9, 14, 9).toISOString() }),
      lead({
        id: "none-active",
        lastDiscussion: { note: "hi", createdAt: new Date(2026, 9, 15, 10).toISOString() },
      }),
      lead({ id: "today-early", nextFollowUpAt: new Date(2026, 9, 15, 8).toISOString() }),
      lead({ id: "upcoming-soon", nextFollowUpAt: new Date(2026, 9, 16, 9).toISOString() }),
      lead({ id: "overdue-old", nextFollowUpAt: new Date(2026, 9, 1, 9).toISOString() }),
    ];

    const { pinned, others } = arrangeLeads(leads, now);

    expect(pinned.map((l) => l.id)).toEqual(["today-early", "today-late"]);
    expect(others.map((l) => l.id)).toEqual([
      "overdue-old",
      "overdue-recent",
      "upcoming-soon",
      "upcoming-far",
      "none-active",
      "none-old",
    ]);
  });

  it("returns empty groups for an empty list", () => {
    expect(arrangeLeads([], now)).toEqual({ pinned: [], others: [] });
  });
});

describe("formatting", () => {
  it("formats relative times", () => {
    expect(timeAgo(new Date(now.getTime() - 30_000), now)).toBe("just now");
    expect(timeAgo(new Date(now.getTime() - 2 * 3600_000), now)).toBe("2 hours ago");
    expect(timeAgo(new Date(now.getTime() - 3 * 86400_000), now)).toBe("3 days ago");
  });

  it("formats follow-up labels relative to today", () => {
    expect(formatFollowUp(new Date(2026, 9, 15, 14, 0), now)).toBe("Today at 2:00 PM");
    expect(formatFollowUp(new Date(2026, 9, 16, 9, 30), now)).toBe("Tomorrow at 9:30 AM");
    expect(formatFollowUp(new Date(2026, 9, 14, 10, 30), now)).toBe("Yesterday at 10:30 AM");
    expect(formatFollowUp(new Date(2026, 9, 20, 11, 0), now)).toBe("Tue, Oct 20 at 11:00 AM");
  });
});

describe("toFollowUpIso", () => {
  it("combines local date and time into a UTC ISO string", () => {
    expect(toFollowUpIso("2026-10-20", "15:45")).toBe(new Date(2026, 9, 20, 15, 45).toISOString());
  });

  it("defaults to 9:00 AM when no time is given", () => {
    expect(toFollowUpIso("2026-10-20", "")).toBe(new Date(2026, 9, 20, 9, 0).toISOString());
  });

  it("returns null without a date", () => {
    expect(toFollowUpIso("", "10:00")).toBeNull();
  });
});
