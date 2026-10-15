"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { AlertCircle, CalendarCheck, CalendarPlus, Loader2, Phone, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiClientError, isAbortError } from "@/lib/api-client";
import { formatFollowUp, timeAgo, toFollowUpIso } from "@/lib/leads/follow-up";
import { LEAD_STATUSES, STATUS_LABELS, type LeadStatus } from "@/lib/leads/status";
import type { LeadDetail } from "@/lib/leads/types";
import { createDiscussionSchema } from "@/lib/leads/validation";
import { cn } from "@/lib/utils";
import { FollowUpChip } from "./follow-up-chip";
import { StatusBadge } from "./status-badge";

type Props = {
  leadId: string | null;
  now: Date;
  onClose: () => void;
  /** Called after any successful mutation so the dashboard can refresh. */
  onChanged: () => void;
};

type LoadState =
  | { key: string; lead: LeadDetail; error?: undefined }
  | { key: string; lead?: undefined; error: string };

export function LeadTimelineDialog({ leadId, now, onClose, onChanged }: Props) {
  const [version, setVersion] = useState(0);
  const [loaded, setLoaded] = useState<LoadState | null>(null);
  const requestKey = leadId ? `${leadId}:${version}` : null;

  useEffect(() => {
    if (!leadId) return;
    const controller = new AbortController();
    const key = `${leadId}:${version}`;
    api
      .getLead(leadId, controller.signal)
      .then((lead) => setLoaded({ key, lead }))
      .catch((error) => {
        if (isAbortError(error)) return;
        setLoaded({ key, error: error instanceof Error ? error.message : "Failed to load lead" });
      });
    return () => controller.abort();
  }, [leadId, version]);

  // Keep showing the previous data for the same lead while a refresh is in flight.
  const current = loaded && leadId && loaded.key.startsWith(`${leadId}:`) ? loaded : null;
  const lead = current?.lead;
  const refreshing = current?.key !== requestKey;

  /** Applies an immediate patch (e.g. a PATCH response), then refetches. */
  function refresh(patch?: Partial<Pick<LeadDetail, "status" | "nextFollowUpAt">>) {
    if (patch) {
      setLoaded((prev) => (prev?.lead ? { ...prev, lead: { ...prev.lead, ...patch } } : prev));
    }
    setVersion((v) => v + 1);
    onChanged();
  }

  return (
    <Dialog open={!!leadId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        {lead ? (
          <LeadBody key={lead.id} lead={lead} now={now} busy={refreshing} onMutated={refresh} />
        ) : current?.error ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <AlertCircle className="size-8 text-red-500" aria-hidden />
            <DialogTitle>Couldn&apos;t load this lead</DialogTitle>
            <DialogDescription>{current.error}</DialogDescription>
            <Button variant="outline" onClick={() => setVersion((v) => v + 1)}>
              <RotateCw aria-hidden /> Try again
            </Button>
          </div>
        ) : (
          <div className="space-y-4 p-6" aria-busy="true">
            <DialogTitle className="sr-only">Loading lead</DialogTitle>
            <DialogDescription className="sr-only">Loading lead timeline</DialogDescription>
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function LeadBody({
  lead,
  now,
  busy,
  onMutated,
}: {
  lead: LeadDetail;
  now: Date;
  busy: boolean;
  onMutated: (patch?: Partial<Pick<LeadDetail, "status" | "nextFollowUpAt">>) => void;
}) {
  const [statusPending, setStatusPending] = useState(false);
  const [clearPending, setClearPending] = useState(false);

  async function changeStatus(status: LeadStatus) {
    if (status === lead.status || statusPending) return;
    setStatusPending(true);
    try {
      const updated = await api.updateLead(lead.id, { status });
      toast.success(`Status changed to ${STATUS_LABELS[status]}`);
      onMutated({ status: updated.status });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update status");
    } finally {
      setStatusPending(false);
    }
  }

  async function clearFollowUp() {
    if (clearPending) return;
    setClearPending(true);
    try {
      await api.updateLead(lead.id, { nextFollowUpAt: null });
      toast.success("Follow-up marked as done");
      onMutated({ nextFollowUpAt: null });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update follow-up");
    } finally {
      setClearPending(false);
    }
  }

  return (
    <>
      {/* Header */}
      <div className="border-b px-5 pt-5 pb-4 sm:px-6">
        <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <DialogTitle className="text-lg leading-tight font-semibold">
              {lead.name}
              {lead.company && <span className="font-normal text-muted-foreground"> ({lead.company})</span>}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                {lead.phone ? (
                  <a
                    href={`tel:${lead.phone}`}
                    className="inline-flex items-center gap-1.5 text-slate-600 hover:text-primary hover:underline"
                  >
                    <Phone aria-hidden className="size-3.5" /> {lead.phone}
                  </a>
                ) : (
                  <span className="text-muted-foreground">No phone on file</span>
                )}
                <StatusBadge status={lead.status} />
              </div>
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="lead-status-select" className="sr-only">
              Lead status
            </Label>
            <Select value={lead.status} onValueChange={(v) => changeStatus(v as LeadStatus)} disabled={statusPending}>
              <SelectTrigger id="lead-status-select" className="w-40" aria-label="Lead status">
                {statusPending && <Loader2 className="animate-spin" aria-hidden />}
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
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {lead.nextFollowUpAt ? (
            <>
              <FollowUpChip at={lead.nextFollowUpAt} now={now} />
              <Button size="xs" variant="ghost" onClick={clearFollowUp} disabled={clearPending}>
                {clearPending ? <Loader2 className="animate-spin" aria-hidden /> : <CalendarCheck aria-hidden />}
                Mark done
              </Button>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">No follow-up scheduled</span>
          )}
        </div>
      </div>

      {/* Timeline */}
      <section
        aria-label="Discussion history"
        aria-busy={busy}
        className={cn("min-h-32 flex-1 overflow-y-auto bg-slate-50/70 px-5 py-5 sm:px-6", busy && "opacity-70")}
      >
        {lead.discussions.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-8 text-center">
            <p className="font-medium text-slate-700">No discussions recorded</p>
            <p className="mt-1 text-sm text-muted-foreground">Log your first conversation below.</p>
          </div>
        ) : (
          <ol className="relative space-y-5 before:absolute before:top-2 before:bottom-2 before:left-[5px] before:w-px before:bg-slate-200">
            {lead.discussions.map((d, i) => {
              const created = new Date(d.createdAt);
              return (
                <li key={d.id} className="relative pl-7">
                  <span
                    aria-hidden
                    className={cn(
                      "absolute top-1.5 left-0 size-[11px] rounded-full ring-4 ring-slate-50",
                      i === 0 ? "bg-primary" : "bg-slate-300",
                    )}
                  />
                  <p className="text-xs text-muted-foreground">
                    <time dateTime={d.createdAt} className="font-medium text-slate-600">
                      {format(created, "MMM d, yyyy · h:mm a")}
                    </time>{" "}
                    ({timeAgo(created, now)})
                  </p>
                  <div className="mt-1.5 rounded-lg border bg-card px-4 py-3 shadow-xs">
                    <p className="text-sm whitespace-pre-wrap text-slate-800">{d.note}</p>
                    {d.followUpAt && (
                      <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                        <CalendarPlus aria-hidden className="size-3.5" />
                        Follow-up set for {formatFollowUp(new Date(d.followUpAt), now)}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <DiscussionForm leadId={lead.id} now={now} onSaved={() => onMutated()} />
    </>
  );
}

function DiscussionForm({ leadId, now, onSaved }: { leadId: string; now: Date; onSaved: () => void }) {
  const [note, setNote] = useState("");
  const [withFollowUp, setWithFollowUp] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [errors, setErrors] = useState<{ note?: string; followUp?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  async function submit(event?: React.FormEvent) {
    event?.preventDefault();
    if (submitting) return;

    let followUpAt: string | null = null;
    if (withFollowUp) {
      if (!date) {
        setErrors({ followUp: "Pick a follow-up date (time defaults to 9:00 AM)" });
        return;
      }
      followUpAt = toFollowUpIso(date, time);
    }

    const parsed = createDiscussionSchema.safeParse({ note, followUpAt });
    if (!parsed.success) {
      const issues = parsed.error.issues;
      setErrors({
        note: issues.find((i) => i.path[0] === "note")?.message,
        followUp: issues.find((i) => i.path[0] === "followUpAt")?.message,
      });
      return;
    }

    setSubmitting(true);
    try {
      await api.addDiscussion(leadId, { note: parsed.data.note, followUpAt });
      toast.success(followUpAt ? "Note saved and follow-up scheduled" : "Note saved");
      setNote("");
      setWithFollowUp(false);
      setDate("");
      setTime("");
      setErrors({});
      onSaved();
    } catch (error) {
      const err = error instanceof ApiClientError ? error : null;
      setErrors({
        note: err?.fieldErrors.note?.[0],
        followUp: err?.fieldErrors.followUpAt?.[0],
      });
      toast.error(err?.message ?? "Could not save the note");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3 border-t bg-card px-5 py-4 sm:px-6">
      <div className="space-y-1.5">
        <Label htmlFor="discussion-note" className="sr-only">
          New discussion note
        </Label>
        <Textarea
          id="discussion-note"
          placeholder="Log a new discussion…"
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setErrors((er) => ({ ...er, note: undefined }));
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void submit();
          }}
          rows={3}
          maxLength={5000}
          aria-invalid={!!errors.note}
          aria-describedby={errors.note ? "discussion-note-error" : undefined}
          className="min-h-20 resize-y"
        />
        {errors.note && (
          <p id="discussion-note-error" className="text-xs text-red-600">
            {errors.note}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <fieldset className="flex flex-wrap items-center gap-2">
          <legend className="sr-only">Follow-up</legend>
          <div className="flex items-center gap-2">
            <Checkbox
              id="discussion-follow-up"
              checked={withFollowUp}
              onCheckedChange={(checked) => {
                setWithFollowUp(checked === true);
                setErrors((er) => ({ ...er, followUp: undefined }));
              }}
            />
            <Label htmlFor="discussion-follow-up" className="font-normal">
              Set follow-up
            </Label>
          </div>
          <Input
            type="date"
            aria-label="Follow-up date"
            value={date}
            min={format(now, "yyyy-MM-dd")}
            onChange={(e) => {
              setDate(e.target.value);
              if (e.target.value) setWithFollowUp(true);
              setErrors((er) => ({ ...er, followUp: undefined }));
            }}
            aria-invalid={!!errors.followUp}
            className="h-8 w-auto"
          />
          <Input
            type="time"
            aria-label="Follow-up time"
            value={time}
            onChange={(e) => {
              setTime(e.target.value);
              if (e.target.value) setWithFollowUp(true);
              setErrors((er) => ({ ...er, followUp: undefined }));
            }}
            aria-invalid={!!errors.followUp}
            className="h-8 w-auto"
          />
        </fieldset>
        <Button type="submit" disabled={submitting} className="sm:self-auto">
          {submitting && <Loader2 className="animate-spin" aria-hidden />}
          {submitting ? "Saving…" : "Save Note"}
        </Button>
      </div>
      {errors.followUp && (
        <p role="alert" className="text-xs text-red-600">
          {errors.followUp}
        </p>
      )}
    </form>
  );
}
