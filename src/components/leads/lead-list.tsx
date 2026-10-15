import { ChevronRight, MessageSquareDashed } from "lucide-react";
import { cn } from "@/lib/utils";
import { getFollowUpState, isPastDue, timeAgo } from "@/lib/leads/follow-up";
import { isClosedStatus } from "@/lib/leads/status";
import type { LeadSummary } from "@/lib/leads/types";
import { FollowUpChip } from "./follow-up-chip";
import { StatusBadge } from "./status-badge";

type Props = {
  leads: LeadSummary[];
  now: Date;
  onOpen: (id: string) => void;
  variant?: "default" | "pinned";
};

function isAttentionNeeded(lead: LeadSummary, now: Date) {
  if (!lead.nextFollowUpAt) return false;
  const at = new Date(lead.nextFollowUpAt);
  return getFollowUpState(at, now) === "overdue" || isPastDue(at, now);
}

function LeadName({ lead }: { lead: LeadSummary }) {
  return (
    <span className="min-w-0">
      <span className="font-semibold text-foreground">{lead.name}</span>
      {lead.company && <span className="text-muted-foreground"> ({lead.company})</span>}
    </span>
  );
}

function LastNote({ lead, now, clamp }: { lead: LeadSummary; now: Date; clamp?: boolean }) {
  if (!lead.lastDiscussion) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground italic">
        <MessageSquareDashed aria-hidden className="size-3.5" />
        No discussions yet
      </span>
    );
  }
  return (
    <span className="block text-sm text-slate-600">
      <span className={cn("block", clamp ? "line-clamp-2" : "line-clamp-1")}>
        <span className="font-medium text-slate-800">Last note: </span>
        {lead.lastDiscussion.note}
      </span>
      <span className="mt-0.5 block text-xs text-muted-foreground">
        {timeAgo(new Date(lead.lastDiscussion.createdAt), now)}
      </span>
    </span>
  );
}

/** Responsive list: a table on md+ screens, stacked cards on mobile. */
export function LeadList({ leads, now, onOpen, variant = "default" }: Props) {
  const pinned = variant === "pinned";

  return (
    <>
      {/* Mobile cards */}
      <ul className="space-y-2.5 md:hidden">
        {leads.map((lead) => {
          const alert = isAttentionNeeded(lead, now);
          return (
            <li key={lead.id}>
              <button
                type="button"
                onClick={() => onOpen(lead.id)}
                className={cn(
                  "w-full rounded-xl border bg-card p-4 text-left shadow-xs transition-colors hover:border-slate-300 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  pinned && "border-blue-200 bg-blue-50/60",
                  alert && "border-l-4 border-l-red-500",
                  isClosedStatus(lead.status) && "opacity-75",
                )}
              >
                <span className="flex items-start justify-between gap-3">
                  <LeadName lead={lead} />
                  <StatusBadge status={lead.status} />
                </span>
                <span className="mt-2 block">
                  <LastNote lead={lead} now={now} clamp />
                </span>
                {lead.nextFollowUpAt && (
                  <FollowUpChip at={lead.nextFollowUpAt} now={now} className="mt-3" />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Desktop table */}
      <div
        className={cn(
          "hidden overflow-hidden rounded-xl border bg-card shadow-xs md:block",
          pinned && "border-blue-200",
        )}
      >
        <table className="w-full table-fixed text-sm">
          <thead className={cn("border-b bg-slate-50/80", pinned && "bg-blue-50/70")}>
            <tr className="text-left text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <th scope="col" className="w-[24%] px-4 py-2.5 font-medium">Lead</th>
              <th scope="col" className="w-[14%] px-4 py-2.5 font-medium">Status</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Last discussion</th>
              <th scope="col" className="w-[29%] px-4 py-2.5 font-medium">Follow-up</th>
              <th scope="col" className="w-10 px-2 py-2.5">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {leads.map((lead) => {
              const alert = isAttentionNeeded(lead, now);
              return (
                <tr
                  key={lead.id}
                  className={cn(
                    "group relative align-top transition-colors hover:bg-slate-50 focus-within:bg-slate-50",
                    pinned && "bg-blue-50/30 hover:bg-blue-50/70",
                    alert && "bg-red-50/40 shadow-[inset_3px_0_0_0_var(--color-red-500)] hover:bg-red-50/70",
                    isClosedStatus(lead.status) && "text-muted-foreground opacity-75",
                  )}
                >
                  <td className="px-4 py-3.5">
                    {/* Stretched button makes the whole row clickable and keyboard accessible. */}
                    <button
                      type="button"
                      onClick={() => onOpen(lead.id)}
                      className="text-left after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-sm focus-visible:after:ring-3 focus-visible:after:ring-ring/50 focus-visible:after:ring-inset"
                      aria-label={`Open timeline for ${lead.name}`}
                    >
                      <span className="block truncate font-semibold text-foreground">{lead.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {lead.company ?? "—"}
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="px-4 py-3.5">
                    {lead.lastDiscussion ? (
                      <>
                        <p className="truncate text-slate-700" title={lead.lastDiscussion.note}>
                          {lead.lastDiscussion.note}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {timeAgo(new Date(lead.lastDiscussion.createdAt), now)}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-muted-foreground italic">No discussions yet</p>
                        <p className="text-xs text-muted-foreground">No discussions recorded</p>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    {lead.nextFollowUpAt ? (
                      <FollowUpChip at={lead.nextFollowUpAt} now={now} />
                    ) : (
                      <span className="text-xs text-muted-foreground">Not scheduled</span>
                    )}
                  </td>
                  <td className="px-2 py-3.5 text-muted-foreground">
                    <ChevronRight aria-hidden className="mt-0.5 size-4 transition-transform group-hover:translate-x-0.5" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
