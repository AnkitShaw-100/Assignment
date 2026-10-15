"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { endOfDay, startOfDay } from "date-fns";
import {
  AlertCircle,
  BellRing,
  CircleCheckBig,
  Pin,
  Plus,
  RotateCw,
  Search,
  SearchX,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useNow } from "@/hooks/use-now";
import { api, isAbortError } from "@/lib/api-client";
import { arrangeLeads } from "@/lib/leads/follow-up";
import { LEAD_STATUSES, STATUS_LABELS, type LeadStatus } from "@/lib/leads/status";
import type { LeadStats, LeadSummary } from "@/lib/leads/types";
import { cn } from "@/lib/utils";
import { AddLeadDialog } from "./add-lead-dialog";
import { LeadList } from "./lead-list";
import { LeadTimelineDialog } from "./lead-timeline-dialog";

type Loaded<T> = { key: string; data: T } | { key: string; error: string };

export function Dashboard() {
  const nowMs = useNow();
  const now = useMemo(() => (nowMs === null ? null : new Date(nowMs)), [nowMs]);

  const [status, setStatus] = useState<LeadStatus | undefined>();
  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search.trim(), 250);
  const [version, setVersion] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);

  const [leadsResult, setLeadsResult] = useState<Loaded<LeadSummary[]> | null>(null);
  const [statsResult, setStatsResult] = useState<Loaded<LeadStats> | null>(null);

  const leadsKey = `${status ?? ""}|${q}|${version}`;
  // Recompute "today" only when the calendar day changes.
  const dayKey = now ? startOfDay(now).toISOString() : null;
  const statsKey = dayKey ? `${dayKey}|${version}` : null;

  useEffect(() => {
    const controller = new AbortController();
    const key = `${status ?? ""}|${q}|${version}`;
    api
      .listLeads({ status, q: q || undefined }, controller.signal)
      .then((data) => setLeadsResult({ key, data }))
      .catch((error) => {
        if (!isAbortError(error)) setLeadsResult({ key, error: (error as Error).message });
      });
    return () => controller.abort();
  }, [status, q, version]);

  useEffect(() => {
    if (!dayKey) return;
    const controller = new AbortController();
    const start = new Date(dayKey);
    api
      .stats({ start, end: new Date(endOfDay(start).getTime() + 1) }, controller.signal)
      .then((data) => setStatsResult({ key: `${dayKey}|${version}`, data }))
      .catch((error) => {
        if (!isAbortError(error)) setStatsResult({ key: `${dayKey}|${version}`, error: (error as Error).message });
      });
    return () => controller.abort();
  }, [dayKey, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  const leads = leadsResult && "data" in leadsResult ? leadsResult.data : null;
  const leadsError = leadsResult && "error" in leadsResult ? leadsResult.error : null;
  const leadsLoading = leadsResult?.key !== leadsKey;
  const stats = statsResult && "data" in statsResult ? statsResult.data : null;
  const statsStale = statsResult?.key !== statsKey;

  const arranged = useMemo(() => (leads && now ? arrangeLeads(leads, now) : null), [leads, now]);
  const hasFilters = !!status || search.trim() !== "";

  function clearFilters() {
    setStatus(undefined);
    setSearch("");
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur supports-backdrop-filter:bg-white/75">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <TrendingUp aria-hidden className="size-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-lg leading-tight font-bold tracking-tight text-slate-900">
                LeadFlow
                {stats && (
                  <span className="ml-2 align-middle text-xs font-medium text-muted-foreground">
                    {stats.total} {stats.total === 1 ? "lead" : "leads"}
                  </span>
                )}
              </h1>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">
                Manage relationships. Close deals.
              </p>
            </div>
          </div>
          <Button onClick={() => setAddOpen(true)}>
            <Plus aria-hidden /> <span>Add Lead</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <StatsGrid stats={stats} stale={statsStale && !stats} />

        <section aria-labelledby="leads-heading" className="space-y-5">
          <h2 id="leads-heading" className="sr-only">
            Leads
          </h2>

          {/* Filters */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-xs">
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                type="search"
                placeholder="Search by name or company…"
                aria-label="Search leads by name or company"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 bg-white pl-9"
              />
            </div>
            <div
              role="group"
              aria-label="Filter by status"
              className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 sm:pb-0"
            >
              <FilterChip active={!status} onClick={() => setStatus(undefined)}>
                All
                {stats && <Count>{stats.total}</Count>}
              </FilterChip>
              {LEAD_STATUSES.map((s) => (
                <FilterChip key={s} active={status === s} onClick={() => setStatus(status === s ? undefined : s)}>
                  {STATUS_LABELS[s]}
                  {stats && <Count>{stats.byStatus[s]}</Count>}
                </FilterChip>
              ))}
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0 text-muted-foreground">
                  <X aria-hidden /> Clear
                </Button>
              )}
            </div>
          </div>

          <div aria-live="polite" className="sr-only">
            {leads && !leadsLoading ? `${leads.length} leads shown` : ""}
          </div>

          {leadsError && !leads ? (
            <ErrorState message={leadsError} onRetry={reload} />
          ) : !arranged || !now ? (
            <ListSkeleton />
          ) : (
            <div className={cn("space-y-7 transition-opacity", leadsLoading && "opacity-60")} aria-busy={leadsLoading}>
              {leadsError && (
                <p role="alert" className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertCircle aria-hidden className="size-4" /> {leadsError}
                  <Button size="xs" variant="outline" className="ml-auto" onClick={reload}>
                    Retry
                  </Button>
                </p>
              )}

              {arranged.pinned.length > 0 && (
                <section aria-labelledby="today-heading" className="space-y-2.5">
                  <SectionHeading id="today-heading" icon={<Pin aria-hidden className="size-3.5 text-red-500" />}>
                    Today&apos;s follow-ups
                    <Count>{arranged.pinned.length}</Count>
                  </SectionHeading>
                  <LeadList leads={arranged.pinned} now={now} onOpen={setOpenLeadId} variant="pinned" />
                </section>
              )}

              <section aria-labelledby="all-heading" className="space-y-2.5">
                <SectionHeading id="all-heading">
                  {status ? `${STATUS_LABELS[status]} leads` : arranged.pinned.length ? "All other leads" : "All leads"}
                  <Count>{arranged.others.length}</Count>
                </SectionHeading>
                {arranged.others.length > 0 ? (
                  <LeadList leads={arranged.others} now={now} onOpen={setOpenLeadId} />
                ) : (
                  <EmptyState
                    filtered={hasFilters}
                    hasPinned={arranged.pinned.length > 0}
                    onClear={clearFilters}
                    onAdd={() => setAddOpen(true)}
                  />
                )}
              </section>
            </div>
          )}
        </section>
      </main>

      <AddLeadDialog open={addOpen} onOpenChange={setAddOpen} onCreated={reload} />
      {now && (
        <LeadTimelineDialog leadId={openLeadId} now={now} onClose={() => setOpenLeadId(null)} onChanged={reload} />
      )}
    </div>
  );
}

function StatsGrid({ stats, stale }: { stats: LeadStats | null; stale: boolean }) {
  const items = [
    { label: "Total leads", value: stats?.total, icon: Users, tone: "text-slate-700 bg-slate-100" },
    { label: "New", value: stats?.byStatus.NEW, icon: Sparkles, tone: "text-sky-700 bg-sky-50" },
    { label: "Qualified", value: stats?.byStatus.QUALIFIED, icon: Target, tone: "text-indigo-700 bg-indigo-50" },
    {
      label: "Due today",
      value: stats?.dueToday,
      icon: BellRing,
      tone: "text-blue-700 bg-blue-50",
      hint: stats && stats.overdue > 0 ? `${stats.overdue} overdue` : undefined,
    },
    { label: "Won", value: stats?.byStatus.WON, icon: CircleCheckBig, tone: "text-emerald-700 bg-emerald-50" },
  ];

  return (
    <section aria-label="Pipeline summary" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map(({ label, value, icon: Icon, tone, hint }) => (
        <div key={label} className="rounded-xl border bg-card px-4 py-3.5 shadow-xs last:col-span-2 sm:last:col-span-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <span className={cn("grid size-7 place-items-center rounded-md", tone)}>
              <Icon aria-hidden className="size-4" />
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            {stale || value === undefined ? (
              <Skeleton className="h-7 w-10" />
            ) : (
              <p className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{value}</p>
            )}
            {hint && <span className="text-xs font-medium text-red-600">{hint}</span>}
          </div>
        </div>
      ))}
    </section>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
      )}
    >
      {children}
    </button>
  );
}

function Count({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-current/10 px-1.5 text-[11px] leading-4 font-semibold tabular-nums opacity-80">
      {children}
    </span>
  );
}

function SectionHeading({ id, icon, children }: { id: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <h3 id={id} className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-slate-500 uppercase">
      {icon}
      {children}
    </h3>
  );
}

function EmptyState({
  filtered,
  hasPinned,
  onClear,
  onAdd,
}: {
  filtered: boolean;
  hasPinned: boolean;
  onClear: () => void;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed bg-white px-6 py-12 text-center">
      <SearchX aria-hidden className="size-8 text-slate-400" />
      <p className="mt-3 font-medium text-slate-800">
        {filtered ? (hasPinned ? "No other leads match" : "No leads match your filters") : hasPinned ? "No other leads" : "No leads yet"}
      </p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {filtered
          ? "Try a different name or status, or clear the filters."
          : "Add your first prospect to start tracking your pipeline."}
      </p>
      <div className="mt-4">
        {filtered ? (
          <Button variant="outline" onClick={onClear}>
            Clear filters
          </Button>
        ) : (
          !hasPinned && (
            <Button onClick={onAdd}>
              <Plus aria-hidden /> Add Lead
            </Button>
          )
        )}
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-xl border border-red-200 bg-red-50/60 px-6 py-12 text-center">
      <AlertCircle aria-hidden className="size-8 text-red-500" />
      <p className="mt-3 font-medium text-slate-800">Couldn&apos;t load leads</p>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" className="mt-4" onClick={onRetry}>
        <RotateCw aria-hidden /> Try again
      </Button>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2.5" aria-busy="true" aria-label="Loading leads">
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-[74px] w-full rounded-xl" />
      ))}
    </div>
  );
}
