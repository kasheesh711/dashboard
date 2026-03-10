import Link from "next/link";
import { Filter, Search, Users } from "lucide-react";
import { SectionCard } from "@/components/shared/section-card";
import { FlashBanner } from "@/components/shared/flash-banner";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatRoleLabel } from "@/lib/auth/roles";
import { requireInternalAccess } from "@/lib/auth/session";
import { listInternalFamilies } from "@/lib/db/queries";
import { formatDisplayDate } from "@/lib/domain/dashboard";
import type { FamilyFilters, OverallStatus, Pathway } from "@/lib/domain/types";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getStringValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function FamiliesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const actor = await requireInternalAccess("/families");
  const resolved = await searchParams;
  const message = getStringValue(resolved.message);
  const error = getStringValue(resolved.error);
  const filters: FamilyFilters = {
    search: getStringValue(resolved.search),
    strategist: getStringValue(resolved.strategist),
    pathway: getStringValue(resolved.pathway) as Pathway | "all" | undefined,
    status: getStringValue(resolved.status) as OverallStatus | "all" | undefined,
    deadlineWindow: getStringValue(resolved.window) as "all" | "7" | "30" | "overdue" | undefined,
  };

  const families = await listInternalFamilies(actor, filters);
  const strategistOptions =
    actor.activeRole === "ops"
      ? [...new Set(families.map((family) => family.strategistOwnerName))].sort()
      : [actor.fullName];

  return (
    <div className="space-y-8">
      <section className="panel rounded-[2rem] px-6 py-8 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
              Family list
            </p>
            <h1 className="section-title mt-3 text-4xl font-semibold">Household workspace roster</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--muted)]">
              Signed in as {actor.fullName}. Current mode: {formatRoleLabel(actor.activeRole)}.
              Families stay grouped at the household level, with student counts and active posture surfaced up front.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/families/new"
              className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white"
            >
              New family
            </Link>
            <Link
              href="/students/new"
              className="rounded-full border border-[var(--border)] bg-white/70 px-5 py-3 text-sm font-semibold"
            >
              Add student
            </Link>
          </div>
        </div>
      </section>

      <FlashBanner message={message} error={error} />

      <SectionCard
        eyebrow="Filters"
        title="Find the next household to review"
        description="Search covers family labels, parent contacts, and student names."
        icon={Filter}
      >
        <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="space-y-2 text-sm">
            <span className="font-semibold text-[var(--muted)]">Search</span>
            <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-white/70 px-3 py-3">
              <Search className="h-4 w-4 text-[var(--muted)]" />
              <input
                name="search"
                defaultValue={filters.search ?? ""}
                placeholder="Family, parent, or student"
                className="w-full bg-transparent outline-none"
              />
            </div>
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-semibold text-[var(--muted)]">Strategist</span>
            <select
              name="strategist"
              defaultValue={filters.strategist ?? "all"}
              disabled={actor.activeRole !== "ops"}
              className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-3 py-3 outline-none disabled:opacity-60"
            >
              <option value="all">All strategists</option>
              {strategistOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-semibold text-[var(--muted)]">Pathway</span>
            <select
              name="pathway"
              defaultValue={filters.pathway ?? "all"}
              className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-3 py-3 outline-none"
            >
              <option value="all">All pathways</option>
              <option value="us_college">US College</option>
              <option value="uk_college">UK College</option>
              <option value="us_boarding">US Boarding</option>
              <option value="uk_boarding">UK Boarding</option>
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-semibold text-[var(--muted)]">Status</span>
            <select
              name="status"
              defaultValue={filters.status ?? "all"}
              className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-3 py-3 outline-none"
            >
              <option value="all">All statuses</option>
              <option value="green">Green</option>
              <option value="yellow">Yellow</option>
              <option value="red">Red</option>
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-semibold text-[var(--muted)]">Deadline window</span>
            <select
              name="window"
              defaultValue={filters.deadlineWindow ?? "all"}
              className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-3 py-3 outline-none"
            >
              <option value="all">All deadlines</option>
              <option value="7">Next 7 days</option>
              <option value="30">Next 30 days</option>
              <option value="overdue">Overdue only</option>
            </select>
          </label>
          <div className="md:col-span-2 xl:col-span-5">
            <button
              type="submit"
              className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white"
            >
              Apply filters
            </button>
          </div>
        </form>
      </SectionCard>

      <div className="space-y-4">
        {families.length === 0 ? (
          <div className="panel rounded-[2rem] p-8 text-sm leading-7 text-[var(--muted)]">
            No households match the current filter set.
          </div>
        ) : (
          families.map((family) => (
            <article key={family.slug} className="panel rounded-[2rem] p-6 transition hover:translate-y-[-1px]">
              <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="section-title text-2xl font-semibold">{family.familyLabel}</h2>
                    <span className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                      <Users className="h-3.5 w-3.5" />
                      {family.studentCount} students
                    </span>
                  </div>
                  <p className="text-sm text-[var(--muted)]">
                    Parent lead: {family.parentContactName} • Strategist: {family.strategistOwnerName} • Ops:{" "}
                    {family.opsOwnerName}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {family.activeStatuses.map((status) => (
                      <StatusBadge key={`${family.slug}-${status}`} status={status} />
                    ))}
                  </div>
                  <div className="rounded-[1.5rem] bg-white/70 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Students</p>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{family.studentNames.join(" • ")}</p>
                  </div>
                  <p className="text-sm leading-7 text-[var(--muted)]">{family.biggestRisk}</p>
                </div>
                <div className="space-y-3 rounded-[1.75rem] bg-[var(--background-soft)] p-5 text-sm text-[var(--muted)]">
                  <p>
                    Next due:{" "}
                    {family.nextCriticalDueDate
                      ? formatDisplayDate(family.nextCriticalDueDate)
                      : "No active due date"}
                  </p>
                  <p>Pending decisions: {family.pendingDecisionCount}</p>
                  <p>Overdue tasks: {family.overdueTaskCount}</p>
                  <p>Updated: {formatDisplayDate(family.lastUpdatedDate)}</p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Link
                      href={`/families/${family.slug}`}
                      className="inline-flex rounded-full bg-[var(--accent)] px-4 py-2 font-semibold text-white"
                    >
                      Open family workspace
                    </Link>
                    <Link
                      href={`/students/new?family=${family.slug}`}
                      className="inline-flex rounded-full border border-[var(--border)] bg-white px-4 py-2 font-semibold"
                    >
                      Add student
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
