/**
 * Repeatable seed: every lead has a fixed UUID, so re-running upserts the same
 * rows and replaces their discussions instead of creating duplicates.
 *
 * All dates are relative to "now" so the dataset always contains a follow-up
 * due today, an overdue one and an upcoming one, whenever the seed is run.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type LeadStatus } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const now = new Date();
const ago = (ms: number) => new Date(now.getTime() - ms);
const ahead = (ms: number) => new Date(now.getTime() + ms);

/** A time later today (local), never spilling past midnight. */
function laterToday(): Date {
  const d = ahead(2 * HOUR);
  if (d.getDate() !== now.getDate()) {
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 30, 0, 0);
    return endOfDay;
  }
  d.setMinutes(0, 0, 0);
  return d;
}

/** A specific local time-of-day N days from today. */
function onDay(offsetDays: number, hours: number, minutes = 0): Date {
  const d = new Date(now);
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

type SeedLead = {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  status: LeadStatus;
  nextFollowUpAt: Date | null;
  // Oldest first, for readability.
  discussions: { note: string; createdAt: Date; followUpAt?: Date }[];
};

const todayFollowUp = laterToday();

const leads: SeedLead[] = [
  {
    id: "5e3d1a10-0000-4000-8000-000000000001",
    name: "Sarah Connor",
    company: "Acme Corp",
    phone: "555-0199",
    status: "PROPOSAL_SENT",
    nextFollowUpAt: todayFollowUp,
    discussions: [
      { note: "Lead created via web form.", createdAt: ago(6 * DAY) },
      {
        note: "Initial discovery call. They need a CRM for 50 reps. Pain points include dropping leads and no follow-up tracking.",
        createdAt: ago(5 * DAY),
      },
      {
        note: "Sent pricing tier PDF. Said she would review with her boss and get back to us.",
        createdAt: ago(2 * DAY),
        followUpAt: todayFollowUp,
      },
    ],
  },
  {
    id: "5e3d1a10-0000-4000-8000-000000000002",
    name: "Hank Scorpio",
    company: "Globex",
    phone: "555-0142",
    status: "NEW",
    nextFollowUpAt: null,
    discussions: [{ note: "Inbound lead from website contact form.", createdAt: ago(2 * HOUR) }],
  },
  {
    id: "5e3d1a10-0000-4000-8000-000000000003",
    name: "Bill Lumbergh",
    company: "Initech",
    phone: "555-0187",
    status: "CONTACTED",
    nextFollowUpAt: onDay(-2, 10, 30),
    discussions: [
      { note: "Met at the FinServ Summit booth. Interested in portfolio reporting.", createdAt: ago(12 * DAY) },
      {
        note: "Left a voicemail with his assistant. Will try again.",
        createdAt: ago(7 * DAY),
        followUpAt: onDay(-2, 10, 30),
      },
    ],
  },
  {
    id: "5e3d1a10-0000-4000-8000-000000000004",
    name: "Bruce Wayne",
    company: "Wayne Enterprises",
    phone: "555-0100",
    status: "WON",
    nextFollowUpAt: null,
    discussions: [
      { note: "Referral from Lucius Fox. Wants wealth-management dashboards for the foundation.", createdAt: ago(40 * DAY) },
      { note: "Demo went well; legal reviewing the MSA.", createdAt: ago(30 * DAY) },
      { note: "Contract signed! Sending welcome package.", createdAt: ago(21 * DAY) },
    ],
  },
  {
    id: "5e3d1a10-0000-4000-8000-000000000005",
    name: "Priya Raman",
    company: "Northwind Capital",
    phone: "555-0123",
    status: "QUALIFIED",
    nextFollowUpAt: onDay(3, 11, 0),
    discussions: [
      { note: "Inbound from LinkedIn ad. Runs a 12-person advisory team.", createdAt: ago(9 * DAY) },
      { note: "Discovery call: budget approved for Q1, decision maker is the COO.", createdAt: ago(4 * DAY) },
      {
        note: "Shared case study. Booked a product demo with the COO.",
        createdAt: ago(1 * DAY),
        followUpAt: onDay(3, 11, 0),
      },
    ],
  },
  {
    id: "5e3d1a10-0000-4000-8000-000000000006",
    name: "Marcus Lee",
    company: "Halcyon Wealth Partners",
    phone: "555-0161",
    status: "PROPOSAL_SENT",
    nextFollowUpAt: onDay(-5, 15, 0),
    discussions: [
      { note: "Warm intro from an existing customer.", createdAt: ago(20 * DAY) },
      {
        note: "Sent proposal for 25 seats with annual billing.",
        createdAt: ago(10 * DAY),
        followUpAt: onDay(-5, 15, 0),
      },
    ],
  },
  {
    id: "5e3d1a10-0000-4000-8000-000000000007",
    name: "Elena Petrova",
    company: "Brightline Advisory",
    phone: null,
    status: "NEW",
    nextFollowUpAt: null,
    discussions: [],
  },
  {
    id: "5e3d1a10-0000-4000-8000-000000000008",
    name: "Tom Becker",
    company: "Cobalt Insurance",
    phone: "555-0174",
    status: "LOST",
    nextFollowUpAt: null,
    discussions: [
      { note: "Requested a quote for 8 seats.", createdAt: ago(35 * DAY) },
      { note: "Chose a competitor on price. Revisit at their renewal next year.", createdAt: ago(25 * DAY) },
    ],
  },
  {
    id: "5e3d1a10-0000-4000-8000-000000000009",
    name: "Aisha Khan",
    company: null,
    phone: "555-0110",
    status: "CONTACTED",
    nextFollowUpAt: onDay(1, 9, 30),
    discussions: [
      {
        note: "Independent advisor. Intro call done, sending onboarding checklist tomorrow.",
        createdAt: ago(5 * HOUR),
        followUpAt: onDay(1, 9, 30),
      },
    ],
  },
];

async function main() {
  for (const lead of leads) {
    const { discussions, id, ...fields } = lead;
    const lastDiscussionAt = discussions.at(-1)?.createdAt ?? null;
    const createdAt = discussions[0]?.createdAt ?? ago(1 * DAY);

    await prisma.$transaction([
      prisma.lead.upsert({
        where: { id },
        create: { id, ...fields, lastDiscussionAt, createdAt },
        update: { ...fields, lastDiscussionAt, createdAt },
      }),
      prisma.discussion.deleteMany({ where: { leadId: id } }),
      prisma.discussion.createMany({
        data: discussions.map((d) => ({
          leadId: id,
          note: d.note,
          createdAt: d.createdAt,
          followUpAt: d.followUpAt ?? null,
        })),
      }),
    ]);
  }
  console.log(`Seeded ${leads.length} leads.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
