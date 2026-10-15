import { describe, expect, it } from "vitest";
import {
  createDiscussionSchema,
  createLeadSchema,
  updateLeadSchema,
} from "@/lib/leads/validation";

describe("createLeadSchema", () => {
  it("trims input, defaults status to NEW and turns blank optionals into null", () => {
    const result = createLeadSchema.parse({ name: "  Ada Lovelace ", company: "  ", phone: "" });
    expect(result).toEqual({ name: "Ada Lovelace", company: null, phone: null, status: "NEW" });
  });

  it("requires a non-blank name", () => {
    expect(createLeadSchema.safeParse({ name: "   " }).success).toBe(false);
    expect(createLeadSchema.safeParse({}).success).toBe(false);
  });

  it("rejects unknown statuses", () => {
    const result = createLeadSchema.safeParse({ name: "Ada", status: "MAYBE" });
    expect(result.success).toBe(false);
  });

  it("rejects malformed phone numbers and unknown fields", () => {
    expect(createLeadSchema.safeParse({ name: "Ada", phone: "call me" }).success).toBe(false);
    expect(createLeadSchema.safeParse({ name: "Ada", email: "a@b.c" }).success).toBe(false);
  });
});

describe("updateLeadSchema", () => {
  it("requires at least one field", () => {
    expect(updateLeadSchema.safeParse({}).success).toBe(false);
  });

  it("accepts a status change and a null follow-up", () => {
    expect(updateLeadSchema.parse({ status: "WON", nextFollowUpAt: null })).toEqual({
      status: "WON",
      nextFollowUpAt: null,
    });
  });
});

describe("createDiscussionSchema", () => {
  it("requires a note", () => {
    expect(createDiscussionSchema.safeParse({ note: "  " }).success).toBe(false);
  });

  it("parses a future follow-up into a Date", () => {
    const future = new Date(Date.now() + 86400_000).toISOString();
    const result = createDiscussionSchema.parse({ note: "Call", followUpAt: future });
    expect(result.followUpAt).toEqual(new Date(future));
  });

  it("rejects follow-ups in the past and non-ISO strings", () => {
    expect(createDiscussionSchema.safeParse({ note: "x", followUpAt: "2020-01-01T00:00:00Z" }).success).toBe(false);
    expect(createDiscussionSchema.safeParse({ note: "x", followUpAt: "tomorrow" }).success).toBe(false);
  });
});
