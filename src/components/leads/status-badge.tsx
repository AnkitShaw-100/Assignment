import { cn } from "@/lib/utils";
import { STATUS_LABELS, type LeadStatus } from "@/lib/leads/status";

export const STATUS_STYLES: Record<LeadStatus, string> = {
  NEW: "bg-sky-50 text-sky-700 ring-sky-600/20",
  CONTACTED: "bg-amber-50 text-amber-800 ring-amber-600/25",
  QUALIFIED: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  PROPOSAL_SENT: "bg-violet-50 text-violet-700 ring-violet-600/20",
  WON: "bg-emerald-50 text-emerald-700 ring-emerald-600/25",
  LOST: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export function StatusBadge({ status, className }: { status: LeadStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide whitespace-nowrap uppercase ring-1 ring-inset",
        STATUS_STYLES[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
