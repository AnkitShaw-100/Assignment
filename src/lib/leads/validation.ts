import { z } from "zod";
import { LEAD_STATUSES } from "./status";

/** Follow-ups slightly in the past are tolerated to absorb client/server clock skew. */
export const FOLLOW_UP_PAST_TOLERANCE_MS = 5 * 60 * 1000;

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be at most ${max} characters`)
    .nullish()
    .transform((value) => (value ? value : null));

export const leadStatusSchema = z.enum(LEAD_STATUSES, {
  error: `Status must be one of: ${LEAD_STATUSES.join(", ")}`,
});

const nameSchema = z
  .string({ error: "Name is required" })
  .trim()
  .min(1, "Name is required")
  .max(120, "Name must be at most 120 characters");

const phoneSchema = z
  .string()
  .trim()
  .max(40, "Phone must be at most 40 characters")
  .refine((value) => value === "" || /^[0-9+()\-.\s]{3,}$/.test(value), {
    message: "Phone may only contain digits, spaces and + ( ) - .",
  })
  .nullish()
  .transform((value) => (value ? value : null));

const followUpSchema = z.iso
  .datetime({ offset: true, error: "Follow-up must be a valid date and time" })
  .transform((value) => new Date(value))
  .refine((date) => date.getTime() >= Date.now() - FOLLOW_UP_PAST_TOLERANCE_MS, {
    message: "Follow-up must be in the future",
  });

export const createLeadSchema = z.strictObject({
  name: nameSchema,
  company: optionalText(120, "Company"),
  phone: phoneSchema,
  status: leadStatusSchema.default("NEW"),
});

export const updateLeadSchema = z
  .strictObject({
    name: nameSchema.optional(),
    company: optionalText(120, "Company").optional(),
    phone: phoneSchema.optional(),
    status: leadStatusSchema.optional(),
    // `null` clears the current follow-up (e.g. once it has been completed).
    nextFollowUpAt: followUpSchema.nullable().optional(),
  })
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    message: "Provide at least one field to update",
  });

export const createDiscussionSchema = z.strictObject({
  note: z
    .string({ error: "Note is required" })
    .trim()
    .min(1, "Note is required")
    .max(5000, "Note must be at most 5000 characters"),
  followUpAt: followUpSchema.nullish(),
});

export const listLeadsQuerySchema = z.object({
  status: leadStatusSchema.optional(),
  q: z.string().trim().max(120).optional(),
});

export const statsQuerySchema = z
  .object({
    dayStart: z.iso.datetime({ offset: true }).transform((v) => new Date(v)),
    dayEnd: z.iso.datetime({ offset: true }).transform((v) => new Date(v)),
  })
  .refine((v) => v.dayEnd > v.dayStart, { message: "dayEnd must be after dayStart" });

export const leadIdSchema = z.uuid({ error: "Invalid lead id" });

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type CreateDiscussionInput = z.infer<typeof createDiscussionSchema>;
