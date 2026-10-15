"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, ApiClientError } from "@/lib/api-client";
import { LEAD_STATUSES, STATUS_LABELS, type LeadStatus } from "@/lib/leads/status";
import type { LeadSummary } from "@/lib/leads/types";
import { createLeadSchema } from "@/lib/leads/validation";

type FormState = { name: string; company: string; phone: string; status: LeadStatus };
type Errors = Partial<Record<keyof FormState | "form", string>>;

const EMPTY: FormState = { name: "", company: "", phone: "", status: "NEW" };

export function AddLeadDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (lead: LeadSummary) => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  function handleOpenChange(next: boolean) {
    if (submitting) return;
    if (!next) {
      setForm(EMPTY);
      setErrors({});
    }
    onOpenChange(next);
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined, form: undefined }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    const parsed = createLeadSchema.safeParse(form);
    if (!parsed.success) {
      const { fieldErrors } = z.flattenError(parsed.error);
      setErrors({
        name: fieldErrors.name?.[0],
        company: fieldErrors.company?.[0],
        phone: fieldErrors.phone?.[0],
        status: fieldErrors.status?.[0],
      });
      return;
    }

    setSubmitting(true);
    try {
      const lead = await api.createLead({
        name: parsed.data.name,
        company: parsed.data.company ?? undefined,
        phone: parsed.data.phone ?? undefined,
        status: parsed.data.status,
      });
      toast.success(`${lead.name} added`);
      setForm(EMPTY);
      setErrors({});
      onCreated(lead);
      onOpenChange(false);
    } catch (error) {
      const err = error instanceof ApiClientError ? error : null;
      if (err?.status === 409) {
        setErrors({ phone: err.message });
      } else if (err && Object.keys(err.fieldErrors).length) {
        setErrors(Object.fromEntries(Object.entries(err.fieldErrors).map(([k, v]) => [k, v[0]])));
      } else {
        setErrors({ form: err?.message ?? "Could not create the lead." });
      }
      toast.error(err?.message ?? "Could not create the lead.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} noValidate className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
            <DialogDescription>Capture a new prospect. Only the name is required.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <Field id="lead-name" label="Full name" required error={errors.name}>
              <Input
                id="lead-name"
                autoFocus
                autoComplete="off"
                placeholder="e.g., John Doe"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "lead-name-error" : undefined}
                maxLength={120}
              />
            </Field>
            <Field id="lead-company" label="Company" optional error={errors.company}>
              <Input
                id="lead-company"
                autoComplete="organization"
                placeholder="e.g., Stark Industries"
                value={form.company}
                onChange={(e) => update("company", e.target.value)}
                aria-invalid={!!errors.company}
                aria-describedby={errors.company ? "lead-company-error" : undefined}
                maxLength={120}
              />
            </Field>
            <Field id="lead-phone" label="Phone" optional error={errors.phone}>
              <Input
                id="lead-phone"
                type="tel"
                autoComplete="tel"
                placeholder="e.g., 555-0123"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? "lead-phone-error" : undefined}
                maxLength={40}
              />
            </Field>
            <Field id="lead-status" label="Status" error={errors.status}>
              <Select value={form.status} onValueChange={(v) => update("status", v as LeadStatus)}>
                <SelectTrigger id="lead-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {errors.form && (
              <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {errors.form}
              </p>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={submitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" aria-hidden />}
              {submitting ? "Saving…" : "Save Lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  id,
  label,
  required,
  optional,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>
        {label}
        {required && (
          <span aria-hidden className="text-red-600">
            *
          </span>
        )}
        {optional && <span className="font-normal text-muted-foreground">(Optional)</span>}
      </Label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
