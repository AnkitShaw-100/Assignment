import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/leads/status";
import type { Discussion, LeadDetail, LeadStats, LeadSummary } from "@/lib/leads/types";
import type {
  CreateDiscussionInput,
  CreateLeadInput,
  UpdateLeadInput,
} from "@/lib/leads/validation";
import { prisma } from "./db";
import { ConflictError, NotFoundError } from "./errors";

const leadFields = {
  id: true,
  name: true,
  company: true,
  phone: true,
  status: true,
  nextFollowUpAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.LeadSelect;

const discussionFields = {
  id: true,
  note: true,
  followUpAt: true,
  createdAt: true,
} satisfies Prisma.DiscussionSelect;

const summarySelect = {
  ...leadFields,
  // Prisma batches this into a single query for all leads (no N+1).
  discussions: {
    select: { note: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 1,
  },
  _count: { select: { discussions: true } },
} satisfies Prisma.LeadSelect;

type LeadRow = Prisma.LeadGetPayload<{ select: typeof leadFields }>;
type SummaryRow = Prisma.LeadGetPayload<{ select: typeof summarySelect }>;
type DiscussionRow = Prisma.DiscussionGetPayload<{ select: typeof discussionFields }>;

const iso = (date: Date | null) => (date ? date.toISOString() : null);

function toLeadBase(row: LeadRow) {
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    phone: row.phone,
    status: row.status,
    nextFollowUpAt: iso(row.nextFollowUpAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toSummary(row: SummaryRow): LeadSummary {
  const latest = row.discussions[0];
  return {
    ...toLeadBase(row),
    lastDiscussion: latest ? { note: latest.note, createdAt: latest.createdAt.toISOString() } : null,
    discussionCount: row._count.discussions,
  };
}

function toDiscussion(row: DiscussionRow): Discussion {
  return {
    id: row.id,
    note: row.note,
    followUpAt: iso(row.followUpAt),
    createdAt: row.createdAt.toISOString(),
  };
}

const digitsOnly = (phone: string) => phone.replace(/\D/g, "");

export async function listLeads(filters: { status?: LeadStatus; q?: string } = {}): Promise<LeadSummary[]> {
  const where: Prisma.LeadWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { company: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  const rows = await prisma.lead.findMany({
    where,
    select: summarySelect,
    orderBy: [
      { nextFollowUpAt: { sort: "asc", nulls: "last" } },
      { lastDiscussionAt: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
    ],
  });
  return rows.map(toSummary);
}

export async function getLeadStats(dayStart: Date, dayEnd: Date): Promise<LeadStats> {
  const [groups, dueToday, overdue] = await Promise.all([
    prisma.lead.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.lead.count({ where: { nextFollowUpAt: { gte: dayStart, lt: dayEnd } } }),
    prisma.lead.count({ where: { nextFollowUpAt: { lt: dayStart } } }),
  ]);
  const byStatus = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0])) as Record<LeadStatus, number>;
  for (const group of groups) byStatus[group.status] = group._count._all;
  const total = Object.values(byStatus).reduce((sum, n) => sum + n, 0);
  return { total, byStatus, dueToday, overdue };
}

export async function getLead(id: string): Promise<LeadDetail> {
  const row = await prisma.lead.findUnique({
    where: { id },
    select: {
      ...leadFields,
      discussions: { select: discussionFields, orderBy: { createdAt: "desc" } },
    },
  });
  if (!row) throw new NotFoundError("Lead not found");
  return { ...toLeadBase(row), discussions: row.discussions.map(toDiscussion) };
}

async function assertPhoneAvailable(phone: string | null, excludeId?: string) {
  if (!phone) return;
  const digits = digitsOnly(phone);
  if (!digits) return;
  // Phones are free-form text, so compare on digits only.
  const matches = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Lead"
    WHERE regexp_replace(phone, '\\D', '', 'g') = ${digits}
    LIMIT 2`;
  if (matches.some((m) => m.id !== excludeId)) {
    throw new ConflictError("A lead with this phone number already exists");
  }
}

export async function createLead(input: CreateLeadInput): Promise<LeadSummary> {
  await assertPhoneAvailable(input.phone);
  const row = await prisma.lead.create({ data: input, select: summarySelect });
  return toSummary(row);
}

export async function updateLead(id: string, input: UpdateLeadInput): Promise<LeadSummary> {
  const exists = await prisma.lead.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new NotFoundError("Lead not found");
  if (input.phone !== undefined) await assertPhoneAvailable(input.phone, id);
  const row = await prisma.lead.update({ where: { id }, data: input, select: summarySelect });
  return toSummary(row);
}

export async function listDiscussions(leadId: string): Promise<Discussion[]> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { discussions: { select: discussionFields, orderBy: { createdAt: "desc" } } },
  });
  if (!lead) throw new NotFoundError("Lead not found");
  return lead.discussions.map(toDiscussion);
}

/**
 * Inserts a discussion and, atomically, bumps the lead's last-activity time.
 * A supplied follow-up *replaces* the lead's current follow-up; omitting it
 * leaves any existing follow-up untouched. Past follow-ups remain on their
 * discussion records.
 */
export async function addDiscussion(leadId: string, input: CreateDiscussionInput): Promise<Discussion> {
  return prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findUnique({ where: { id: leadId }, select: { id: true } });
    if (!lead) throw new NotFoundError("Lead not found");

    const discussion = await tx.discussion.create({
      data: { leadId, note: input.note, followUpAt: input.followUpAt ?? null },
      select: discussionFields,
    });
    await tx.lead.update({
      where: { id: leadId },
      data: {
        lastDiscussionAt: discussion.createdAt,
        ...(input.followUpAt ? { nextFollowUpAt: input.followUpAt } : {}),
      },
    });
    return toDiscussion(discussion);
  });
}
