import Link from "next/link";
import { BarChart3, Filter, Search, SlidersHorizontal } from "lucide-react";
import { ScatterPlot } from "@/components/analytics/scatter-plot";
import { MetricCard } from "@/components/shared/metric-card";
import { SectionCard } from "@/components/shared/section-card";
import { requireInternalAccess } from "@/lib/auth/session";
import {
  loadCollegebaseAnalyticsDataset,
  type CollegebaseAnalyticsFilters,
} from "@/lib/domain/collegebase-analytics";
import { buildCollegebaseAnalyticsSnapshot } from "@/lib/reporting/collegebase-analytics";
import { analyticsFiltersSchema } from "@/lib/validation/schema";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getStringValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildFilters(searchParams: Record<string, string | string[] | undefined>): CollegebaseAnalyticsFilters {
  const parsed = analyticsFiltersSchema.safeParse({
    school: getStringValue(searchParams.school),
    schoolQuery: getStringValue(searchParams.schoolQuery),
    major: getStringValue(searchParams.major),
    gpaMin: getStringValue(searchParams.gpaMin),
    gpaMax: getStringValue(searchParams.gpaMax),
    satMin: getStringValue(searchParams.satMin),
    satMax: getStringValue(searchParams.satMax),
    actMin: getStringValue(searchParams.actMin),
    actMax: getStringValue(searchParams.actMax),
    metric: getStringValue(searchParams.metric) ?? "sat",
    outcome: getStringValue(searchParams.outcome) ?? "all",
  });

  return parsed.success
    ? {
        ...parsed.data,
        metric: parsed.data.metric ?? "sat",
        outcome: parsed.data.outcome ?? "all",
      }
    : {
        metric: "sat",
        outcome: "all",
      };
}

function buildAnalyticsHref(
  searchParams: Record<string, string | string[] | undefined>,
  updates: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (updates[key] !== undefined || value == null) continue;

    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
      continue;
    }

    params.set(key, value);
  }

  for (const [key, value] of Object.entries(updates)) {
    if (value) {
      params.set(key, value);
    }
  }

  return `/analytics${params.toString() ? `?${params.toString()}` : ""}`;
}

function formatAverage(value?: number, sampleSize?: number) {
  if (value == null || sampleSize == null || sampleSize === 0) return "—";
  return `${value.toFixed(2)} (${sampleSize})`;
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireInternalAccess("/analytics");
  const resolved = await searchParams;
  const filters = buildFilters(resolved);

  let dataset = null;
  let loadError: string | null = null;

  try {
    dataset = await loadCollegebaseAnalyticsDataset();
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : "Unable to load the local Collegebase analytics dataset.";
  }

  if (!dataset) {
    return (
      <div className="panel rounded-[2rem] p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
          Analytics
        </p>
        <h1 className="section-title mt-3 text-3xl font-semibold">Collegebase analytics is unavailable</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--muted)]">
          This route reads a local normalized dataset from `tmp/collegebase`. Fix the file or regenerate it, then reload.
        </p>
        <p className="mt-4 rounded-[1.25rem] bg-[var(--warn-soft)] px-4 py-3 text-sm text-[var(--warn)]">
          {loadError}
        </p>
      </div>
    );
  }

  const snapshot = buildCollegebaseAnalyticsSnapshot(dataset, filters);
  const schoolOptions = snapshot.selectedSchool && !snapshot.availableSchools.includes(snapshot.selectedSchool)
    ? [snapshot.selectedSchool, ...snapshot.availableSchools]
    : snapshot.availableSchools;
  const accepted = snapshot.outcomeSummaries.find((item) => item.outcome === "accepted");
  const rejected = snapshot.outcomeSummaries.find((item) => item.outcome === "rejected");
  const summaryLabel = snapshot.selectedSchool ?? "Filtered dataset";

  return (
    <div className="space-y-8">
      <section className="panel rounded-[2rem] px-6 py-8 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
              Analytics
            </p>
            <h1 className="section-title mt-3 text-4xl font-semibold">Collegebase admissions analytics</h1>
            <p className="mt-4 text-base leading-8 text-[var(--muted)]">
              Query the extracted applicant dataset by school, intended major, GPA, SAT, and ACT. Search a school to split accepted versus rejected cohorts, compare score averages, and drill into the underlying profiles.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-[var(--border)] bg-white/70 px-4 py-4 text-sm text-[var(--muted)]">
            <p>Applicant records: {dataset.records.length}</p>
            <p>Unique schools: {dataset.availableSchools.length}</p>
            <p>Selected view: {summaryLabel}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Filtered applicants"
          value={String(snapshot.coverage.applicantCount)}
          helper={`${snapshot.coverage.schoolCount} schools across accepted and rejected outcomes`}
        />
        <MetricCard
          label="SAT coverage"
          value={String(snapshot.coverage.satCount)}
          helper="Applicants with reported SAT"
        />
        <MetricCard
          label="ACT coverage"
          value={String(snapshot.coverage.actCount)}
          helper="Applicants with reported ACT"
        />
        <MetricCard
          label="GPA coverage"
          value={String(snapshot.coverage.gpaCount)}
          helper="Applicants with unweighted GPA"
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <SectionCard
          eyebrow="Filters"
          title="Search and constrain the applicant pool"
          description="URL params are the source of truth, so filtered views stay shareable."
          icon={Filter}
        >
          <form className="space-y-4">
            <label className="block text-sm">
              <span className="mb-2 block font-semibold text-[var(--muted)]">School search</span>
              <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-white/70 px-3 py-3">
                <Search className="h-4 w-4 text-[var(--muted)]" />
                <input
                  name="schoolQuery"
                  defaultValue={filters.schoolQuery ?? ""}
                  placeholder="Filter school options"
                  className="w-full bg-transparent outline-none"
                />
              </div>
            </label>

            <label className="block text-sm">
              <span className="mb-2 block font-semibold text-[var(--muted)]">School</span>
              <select
                name="school"
                defaultValue={filters.school ?? ""}
                className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
              >
                <option value="">All schools</option>
                {schoolOptions.map((school) => (
                  <option key={school} value={school}>
                    {school}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-2 block font-semibold text-[var(--muted)]">Intended major</span>
              <select
                name="major"
                defaultValue={filters.major ?? ""}
                className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
              >
                <option value="">All majors</option>
                {snapshot.availableMajors.map((major) => (
                  <option key={major.label} value={major.label}>
                    {major.label} ({major.applicantCount})
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-2 block font-semibold text-[var(--muted)]">GPA min</span>
                <input
                  name="gpaMin"
                  type="number"
                  step="0.01"
                  min="0"
                  max="5"
                  defaultValue={filters.gpaMin ?? ""}
                  className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-2 block font-semibold text-[var(--muted)]">GPA max</span>
                <input
                  name="gpaMax"
                  type="number"
                  step="0.01"
                  min="0"
                  max="5"
                  defaultValue={filters.gpaMax ?? ""}
                  className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-2 block font-semibold text-[var(--muted)]">SAT min</span>
                <input
                  name="satMin"
                  type="number"
                  min="200"
                  max="1600"
                  defaultValue={filters.satMin ?? ""}
                  className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-2 block font-semibold text-[var(--muted)]">SAT max</span>
                <input
                  name="satMax"
                  type="number"
                  min="200"
                  max="1600"
                  defaultValue={filters.satMax ?? ""}
                  className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-2 block font-semibold text-[var(--muted)]">ACT min</span>
                <input
                  name="actMin"
                  type="number"
                  min="1"
                  max="36"
                  defaultValue={filters.actMin ?? ""}
                  className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-2 block font-semibold text-[var(--muted)]">ACT max</span>
                <input
                  name="actMax"
                  type="number"
                  min="1"
                  max="36"
                  defaultValue={filters.actMax ?? ""}
                  className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
                />
              </label>
            </div>

            <label className="block text-sm">
              <span className="mb-2 block font-semibold text-[var(--muted)]">Applicant roster</span>
              <select
                name="outcome"
                defaultValue={filters.outcome}
                className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
              >
                <option value="all">Accepted + rejected</option>
                <option value="accepted">Accepted only</option>
                <option value="rejected">Rejected only</option>
              </select>
            </label>

            <input type="hidden" name="metric" value={filters.metric} />

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white"
              >
                Apply filters
              </button>
              <Link
                href="/analytics"
                className="rounded-full border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold"
              >
                Reset
              </Link>
            </div>
          </form>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard
            eyebrow="Accepted vs rejected"
            title={summaryLabel}
            description={
              snapshot.selectedSchool
                ? "Applicant-level averages for the selected university."
                : "Macroscopic averages across all filtered application outcomes."
            }
            icon={BarChart3}
          >
            <div className="grid gap-4 lg:grid-cols-2">
              {[accepted, rejected].map((summary) =>
                summary ? (
                  <article
                    key={summary.outcome}
                    className="rounded-[1.75rem] border border-[var(--border)] bg-white/75 p-5"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                      {summary.outcome}
                    </p>
                    <p className="section-title mt-3 text-4xl font-semibold">{summary.totalCount}</p>
                    <div className="mt-4 space-y-2 text-sm text-[var(--muted)]">
                      <p>SAT avg: {formatAverage(summary.averageSat, summary.satSampleSize)}</p>
                      <p>ACT avg: {formatAverage(summary.averageAct, summary.actSampleSize)}</p>
                      <p>GPA avg: {formatAverage(summary.averageGpa, summary.gpaSampleSize)}</p>
                    </div>
                  </article>
                ) : null,
              )}
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="School map"
            title="Queryable school landscape"
            description="Use this roster to pivot into one university and open the accepted versus rejected split."
            icon={SlidersHorizontal}
          >
            <div className="space-y-3">
              {snapshot.schoolRows.slice(0, 18).map((school) => (
                <div
                  key={school.schoolName}
                  className="flex flex-col gap-3 rounded-[1.5rem] border border-[var(--border)] bg-white/75 px-4 py-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-semibold">{school.schoolName}</p>
                    <p className="text-sm text-[var(--muted)]">
                      Accepted {school.acceptedCount} • Rejected {school.rejectedCount}
                    </p>
                  </div>
                  <Link
                    href={buildAnalyticsHref(resolved, { school: school.schoolName })}
                    className="inline-flex rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold"
                  >
                    View school
                  </Link>
                </div>
              ))}
              {snapshot.schoolRows.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">
                  No school outcomes match the current applicant filters.
                </p>
              ) : null}
            </div>
          </SectionCard>
        </div>
      </div>

      <SectionCard
        eyebrow="Scatter plot"
        title={snapshot.selectedSchool ? `${snapshot.selectedSchool} distribution` : "Select a school to plot scores"}
        description={
          snapshot.selectedSchool
            ? `${snapshot.scatter.excludedCount} applicants were excluded because they were missing ${filters.metric.toUpperCase()} or unweighted GPA.`
            : "The SAT/ACT versus GPA plot is school-specific, so it appears after a university is selected."
        }
        icon={BarChart3}
      >
        <div className="mb-4 flex flex-wrap gap-3">
          <Link
            href={buildAnalyticsHref(resolved, { metric: "sat" })}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              filters.metric === "sat"
                ? "bg-[var(--accent)] text-white"
                : "border border-[var(--border)] bg-white"
            }`}
          >
            SAT
          </Link>
          <Link
            href={buildAnalyticsHref(resolved, { metric: "act" })}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              filters.metric === "act"
                ? "bg-[var(--accent)] text-white"
                : "border border-[var(--border)] bg-white"
            }`}
          >
            ACT
          </Link>
        </div>
        {snapshot.selectedSchool ? (
          <ScatterPlot points={snapshot.scatter.points} metric={filters.metric} />
        ) : (
          <div className="rounded-[1.75rem] border border-dashed border-[var(--border)] bg-white/60 px-6 py-8 text-sm leading-7 text-[var(--muted)]">
            Search or choose a school above to see the accepted versus rejected score distribution.
          </div>
        )}
      </SectionCard>

      <SectionCard
        eyebrow="Drill-down"
        title={snapshot.selectedSchool ? `Profiles at ${snapshot.selectedSchool}` : "School-specific applicant roster"}
        description={
          snapshot.selectedSchool
            ? "Open any extracted record to inspect the rest of the applicant profile."
            : "Select a school to split the applicant roster by accepted versus rejected."
        }
        icon={Search}
      >
        {snapshot.selectedSchool ? (
          <div className="grid gap-6 xl:grid-cols-2">
            {(["accepted", "rejected"] as const).map((outcome) => {
              const items = snapshot.roster[outcome];

              return (
                <div key={outcome} className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                    {outcome}
                  </p>
                  {items.length > 0 ? (
                    items.map((item) => (
                      <article
                        key={`${outcome}-${item.sourceId}`}
                        className="rounded-[1.5rem] border border-[var(--border)] bg-white/75 p-4"
                      >
                        <p className="font-semibold">{item.label}</p>
                        <p className="mt-1 text-sm text-[var(--muted)]">{item.subtitle}</p>
                        <p className="mt-3 text-sm text-[var(--muted)]">
                          GPA {item.unweightedGpa ?? "—"} • SAT {item.satComposite ?? "—"} • ACT{" "}
                          {item.actComposite ?? "—"}
                        </p>
                        <p className="mt-2 text-sm text-[var(--muted)]">
                          {item.majors.join(" • ") || "No intended major"} • {item.activityCount} activities •{" "}
                          {item.awardCount} awards
                        </p>
                        <Link
                          href={`/analytics/applicants/${item.sourceId}`}
                          className="mt-4 inline-flex rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold"
                        >
                          Open extracted profile
                        </Link>
                      </article>
                    ))
                  ) : (
                    <p className="rounded-[1.5rem] bg-white/70 px-4 py-4 text-sm text-[var(--muted)]">
                      No {outcome} applicants match the current filters.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[1.75rem] border border-dashed border-[var(--border)] bg-white/60 px-6 py-8 text-sm leading-7 text-[var(--muted)]">
            Choose a school from the filter rail or school landscape to unlock the applicant drill-down.
          </div>
        )}
      </SectionCard>
    </div>
  );
}

