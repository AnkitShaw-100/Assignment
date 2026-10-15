import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { GET as listLeads, POST as createLead } from "@/app/api/leads/route";
import { GET as getLead, PATCH as patchLead } from "@/app/api/leads/[id]/route";
import { GET as listDiscussions, POST as createDiscussion } from "@/app/api/leads/[id]/discussions/route";
import { GET as getStats } from "@/app/api/stats/route";
import { ctx, jsonRequest, prisma, resetDb } from "../helpers";

const MISSING_ID = "00000000-0000-4000-8000-000000000000";
const inDays = (days: number) => new Date(Date.now() + days * 86400_000);

async function seedLead(data: Partial<Parameters<typeof prisma.lead.create>[0]["data"]> = {}) {
  return prisma.lead.create({ data: { name: "Sarah Connor", company: "Acme Corp", ...data } });
}

beforeEach(resetDb);
afterAll(async () => {
  await resetDb();
  await prisma.$disconnect();
});

describe("POST /api/leads", () => {
  it("creates a lead with default status NEW and returns 201", async () => {
    const res = await createLead(jsonRequest("POST", "/api/leads", { name: "Ada Lovelace", phone: "555-0100" }));
    expect(res.status).toBe(201);
    const { data } = await res.json();
    expect(data).toMatchObject({
      name: "Ada Lovelace",
      company: null,
      phone: "555-0100",
      status: "NEW",
      nextFollowUpAt: null,
      lastDiscussion: null,
      discussionCount: 0,
    });
    expect(await prisma.lead.count()).toBe(1);
  });

  it("rejects a missing name with field errors", async () => {
    const res = await createLead(jsonRequest("POST", "/api/leads", { company: "Acme" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.fieldErrors.name).toBeDefined();
    expect(await prisma.lead.count()).toBe(0);
  });

  it("rejects an invalid status", async () => {
    const res = await createLead(jsonRequest("POST", "/api/leads", { name: "Ada", status: "ARCHIVED" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.fieldErrors.status).toBeDefined();
  });

  it("rejects malformed JSON", async () => {
    const res = await createLead(jsonRequest("POST", "/api/leads", "{not json"));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_JSON");
  });

  it("returns 409 when the phone number already belongs to a lead", async () => {
    await seedLead({ phone: "555-0199" });
    const res = await createLead(jsonRequest("POST", "/api/leads", { name: "Other", phone: "(555) 0199" }));
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("CONFLICT");
  });
});

describe("GET /api/leads", () => {
  it("returns leads with their latest discussion, filtered by status and search", async () => {
    const sarah = await seedLead({ status: "PROPOSAL_SENT" });
    await seedLead({ name: "Hank Scorpio", company: "Globex", status: "NEW" });
    await prisma.discussion.createMany({
      data: [
        { leadId: sarah.id, note: "Older note", createdAt: new Date(Date.now() - 86400_000) },
        { leadId: sarah.id, note: "Newest note" },
      ],
    });

    const all = await (await listLeads(jsonRequest("GET", "/api/leads"))).json();
    expect(all.data).toHaveLength(2);
    const sarahRow = all.data.find((l: { id: string }) => l.id === sarah.id);
    expect(sarahRow.lastDiscussion.note).toBe("Newest note");
    expect(sarahRow.discussionCount).toBe(2);

    const byStatus = await (await listLeads(jsonRequest("GET", "/api/leads?status=NEW"))).json();
    expect(byStatus.data.map((l: { name: string }) => l.name)).toEqual(["Hank Scorpio"]);

    const bySearch = await (await listLeads(jsonRequest("GET", "/api/leads?q=sar"))).json();
    expect(bySearch.data.map((l: { name: string }) => l.name)).toEqual(["Sarah Connor"]);

    const byCompany = await (await listLeads(jsonRequest("GET", "/api/leads?q=GLOBEX"))).json();
    expect(byCompany.data.map((l: { name: string }) => l.name)).toEqual(["Hank Scorpio"]);
  });

  it("rejects an unknown status filter", async () => {
    const res = await listLeads(jsonRequest("GET", "/api/leads?status=BOGUS"));
    expect(res.status).toBe(400);
  });
});

describe("GET /api/leads/:id", () => {
  it("returns 404 for a lead that does not exist", async () => {
    const res = await getLead(jsonRequest("GET", `/api/leads/${MISSING_ID}`), ctx({ id: MISSING_ID }));
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("NOT_FOUND");
  });

  it("returns 400 for a malformed id", async () => {
    const res = await getLead(jsonRequest("GET", "/api/leads/abc"), ctx({ id: "abc" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_ID");
  });

  it("returns the lead with discussions newest first", async () => {
    const lead = await seedLead();
    const base = Date.now();
    await prisma.discussion.createMany({
      data: [
        { leadId: lead.id, note: "first", createdAt: new Date(base - 3000) },
        { leadId: lead.id, note: "third", createdAt: new Date(base - 1000) },
        { leadId: lead.id, note: "second", createdAt: new Date(base - 2000) },
      ],
    });
    const res = await getLead(jsonRequest("GET", `/api/leads/${lead.id}`), ctx({ id: lead.id }));
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.discussions.map((d: { note: string }) => d.note)).toEqual(["third", "second", "first"]);
  });
});

describe("PATCH /api/leads/:id", () => {
  it("updates the status and persists it while keeping history", async () => {
    const lead = await seedLead();
    await prisma.discussion.create({ data: { leadId: lead.id, note: "Discovery call" } });

    const res = await patchLead(jsonRequest("PATCH", `/api/leads/${lead.id}`, { status: "QUALIFIED" }), ctx({ id: lead.id }));
    expect(res.status).toBe(200);
    expect((await res.json()).data.status).toBe("QUALIFIED");

    const stored = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id }, include: { discussions: true } });
    expect(stored.status).toBe("QUALIFIED");
    expect(stored.discussions).toHaveLength(1);
  });

  it("rejects an invalid status", async () => {
    const lead = await seedLead();
    const res = await patchLead(jsonRequest("PATCH", `/api/leads/${lead.id}`, { status: "DONE" }), ctx({ id: lead.id }));
    expect(res.status).toBe(400);
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } })).status).toBe("NEW");
  });

  it("returns 404 for a missing lead", async () => {
    const res = await patchLead(jsonRequest("PATCH", `/api/leads/${MISSING_ID}`, { status: "WON" }), ctx({ id: MISSING_ID }));
    expect(res.status).toBe(404);
  });

  it("clears the current follow-up when nextFollowUpAt is null", async () => {
    const lead = await seedLead({ nextFollowUpAt: inDays(1) });
    const res = await patchLead(jsonRequest("PATCH", `/api/leads/${lead.id}`, { nextFollowUpAt: null }), ctx({ id: lead.id }));
    expect(res.status).toBe(200);
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } })).nextFollowUpAt).toBeNull();
  });
});

describe("POST /api/leads/:id/discussions", () => {
  it("creates a discussion, returns 201 and bumps last activity", async () => {
    const lead = await seedLead();
    const res = await createDiscussion(
      jsonRequest("POST", `/api/leads/${lead.id}/discussions`, { note: "  Left a voicemail  " }),
      ctx({ id: lead.id }),
    );
    expect(res.status).toBe(201);
    const { data } = await res.json();
    expect(data).toMatchObject({ note: "Left a voicemail", followUpAt: null });

    const stored = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(stored.lastDiscussionAt?.toISOString()).toBe(data.createdAt);
  });

  it("schedules a follow-up and updates the lead in the same transaction", async () => {
    const lead = await seedLead();
    const followUpAt = inDays(2).toISOString();
    const res = await createDiscussion(
      jsonRequest("POST", `/api/leads/${lead.id}/discussions`, { note: "Sent pricing", followUpAt }),
      ctx({ id: lead.id }),
    );
    expect(res.status).toBe(201);
    expect((await res.json()).data.followUpAt).toBe(followUpAt);

    const stored = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(stored.nextFollowUpAt?.toISOString()).toBe(followUpAt);
  });

  it("replaces an existing follow-up, keeping the old one in history", async () => {
    const lead = await seedLead();
    const first = inDays(1).toISOString();
    const second = inDays(5).toISOString();
    for (const [note, followUpAt] of [["one", first], ["two", second]]) {
      await createDiscussion(jsonRequest("POST", `/api/leads/${lead.id}/discussions`, { note, followUpAt }), ctx({ id: lead.id }));
    }
    const stored = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(stored.nextFollowUpAt?.toISOString()).toBe(second);
    const history = await prisma.discussion.findMany({ where: { leadId: lead.id }, orderBy: { createdAt: "asc" } });
    expect(history.map((d) => d.followUpAt?.toISOString())).toEqual([first, second]);
  });

  it("does not clear an existing follow-up when none is supplied", async () => {
    const existing = inDays(3);
    const lead = await seedLead({ nextFollowUpAt: existing });
    await createDiscussion(jsonRequest("POST", `/api/leads/${lead.id}/discussions`, { note: "Quick check-in" }), ctx({ id: lead.id }));
    const stored = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(stored.nextFollowUpAt?.toISOString()).toBe(existing.toISOString());
  });

  it("rejects an empty note or a past follow-up without writing anything", async () => {
    const lead = await seedLead();
    const empty = await createDiscussion(jsonRequest("POST", `/api/leads/${lead.id}/discussions`, { note: "" }), ctx({ id: lead.id }));
    expect(empty.status).toBe(400);
    const past = await createDiscussion(
      jsonRequest("POST", `/api/leads/${lead.id}/discussions`, { note: "x", followUpAt: "2020-01-01T00:00:00.000Z" }),
      ctx({ id: lead.id }),
    );
    expect(past.status).toBe(400);
    expect(await prisma.discussion.count()).toBe(0);
  });

  it("returns 404 for a missing lead", async () => {
    const res = await createDiscussion(
      jsonRequest("POST", `/api/leads/${MISSING_ID}/discussions`, { note: "Hello" }),
      ctx({ id: MISSING_ID }),
    );
    expect(res.status).toBe(404);
    expect(await prisma.discussion.count()).toBe(0);
  });

  it("lists discussions newest first", async () => {
    const lead = await seedLead();
    for (const note of ["first", "second", "third"]) {
      await createDiscussion(jsonRequest("POST", `/api/leads/${lead.id}/discussions`, { note }), ctx({ id: lead.id }));
      await new Promise((r) => setTimeout(r, 5));
    }
    const res = await listDiscussions(jsonRequest("GET", `/api/leads/${lead.id}/discussions`), ctx({ id: lead.id }));
    expect(res.status).toBe(200);
    expect((await res.json()).data.map((d: { note: string }) => d.note)).toEqual(["third", "second", "first"]);
  });
});

describe("GET /api/stats", () => {
  it("counts statuses and follow-ups due in the supplied local day", async () => {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 86400_000);
    await seedLead({ status: "NEW", nextFollowUpAt: new Date(dayStart.getTime() + 10 * 3600_000) });
    await seedLead({ name: "B", status: "WON", nextFollowUpAt: new Date(dayStart.getTime() - 3600_000) });
    await seedLead({ name: "C", status: "QUALIFIED", nextFollowUpAt: new Date(dayEnd.getTime() + 3600_000) });

    const qs = new URLSearchParams({ dayStart: dayStart.toISOString(), dayEnd: dayEnd.toISOString() });
    const res = await getStats(jsonRequest("GET", `/api/stats?${qs}`));
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data).toMatchObject({ total: 3, dueToday: 1, overdue: 1 });
    expect(data.byStatus).toMatchObject({ NEW: 1, WON: 1, QUALIFIED: 1, LOST: 0 });
  });

  it("requires valid day bounds", async () => {
    const res = await getStats(jsonRequest("GET", "/api/stats"));
    expect(res.status).toBe(400);
  });
});
