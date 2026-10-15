import { AlarmClock, BellRing, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatFollowUp, getFollowUpState, isPastDue } from "@/lib/leads/follow-up";

/** Coloured follow-up label: red when overdue/past due, blue for today, neutral when upcoming. */
export function FollowUpChip({
  at,
  now,
  className,
}: {
  at: string;
  now: Date;
  className?: string;
}) {
  const date = new Date(at);
  const state = getFollowUpState(date, now);
  const late = isPastDue(date, now);
  const label = formatFollowUp(date, now);

  const { Icon, tone, prefix } =
    state === "overdue" || late
      ? { Icon: AlarmClock, tone: "bg-red-50 text-red-700 ring-red-600/20", prefix: "Overdue" }
      : state === "today"
        ? { Icon: BellRing, tone: "bg-blue-50 text-blue-700 ring-blue-600/20", prefix: "Follow-up" }
        : { Icon: CalendarClock, tone: "bg-slate-50 text-slate-700 ring-slate-500/20", prefix: "Follow-up" };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        tone,
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5 shrink-0" />
      <span>
        <span className="font-semibold">{prefix}</span> · {label}
      </span>
    </span>
  );
}
