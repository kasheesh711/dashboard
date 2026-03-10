import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Filter, Search, School } from "lucide-react";
import { addFamilyCollegeListItemAction } from "@/app/families/actions";
import { FeaturedCollegeCard } from "@/components/colleges/featured-college-card";
import { MetricCard } from "@/components/shared/metric-card";
import { SectionCard } from "@/components/shared/section-card";
import { requireInternalAccess } from "@/lib/auth/session";
import { getInternalFamilyBySlug } from "@/lib/db/queries";
import {
  formatCollegeMoney,
  formatCollegePercent,
  getCurrentFamilyCollegeList,
  getFeaturedCollegeSearchResult,
  getPrimaryUsCollegeStudent,
  isCollegeScorecardConfigured,
  searchCollegeScorecard,
  suggestCollegeBucket,
} from "@/lib/domain/college-scorecard";
import { cip4Options } from "@/lib/domain/cip4";
import { collegeSearchFiltersSchema } from "@/lib/validation/schema";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getStringValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildFilters(searchParams: Record<string, string | string[] | undefined>) {
  const parsed = collegeSearchFiltersSchema.safeParse({
    familySlug: getStringValue(searchParams.family),
    query: getStringValue(searchParams.q),
    state: getStringValue(searchParams.state)?.toUpperCase(),
    city: getStringValue(searchParams.city),
    ownership: getStringValue(searchParams.ownership) ?? "all",
    sizeMin: getStringValue(searchParams.sizeMin),
    sizeMax: getStringValue(searchParams.sizeMax),
    admissionRateMin: getStringValue(searchParams.admissionRateMin),
    admissionRateMax: getStringValue(searchParams.admissionRateMax),
    satMin: getStringValue(searchParams.satMin),
    satMax: getStringValue(searchParams.satMax),
    netPriceMax: getStringValue(searchParams.netPriceMax),
    completionMin: getStringValue(searchParams.completionMin),
    retentionMin: getStringValue(searchParams.retentionMin),
    earningsMin: getStringValue(searchParams.earningsMin),
    zip: getStringValue(searchParams.zip),
    distance: getStringValue(searchParams.distance),
    programCode: getStringValue(searchParams.programCode),
    sort: getStringValue(searchParams.sort) ?? "name_asc",
    page: getStringValue(searchParams.page) ?? "0",
    perPage: getStringValue(searchParams.perPage) ?? "12",
    selected: getStringValue(searchParams.selected),
  });

  return parsed.success
    ? {
        ...parsed.data,
        selectedScorecardSchoolId: parsed.data.selected,
      }
    : {
        ownership: "all" as const,
        sort: "name_asc" as const,
        page: 0,
        perPage: 12,
        selectedScorecardSchoolId: undefined,
      };
}

function buildCollegeSelectionHref(
  searchParams: Record<string, string | string[] | undefined>,
  selectedScorecardSchoolId: number,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "selected" || value == null) continue;

    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
      continue;
    }

    params.set(key, value);
  }

  params.set("selected", String(selectedScorecardSchoolId));

  return `/colleges?${params.toString()}`;
}

export default async function CollegesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const actor = await requireInternalAccess("/colleges");
  const resolved = await searchParams;
  const filters = buildFilters(resolved);
  const familySlug = filters.familySlug;
  const family = familySlug ? await getInternalFamilyBySlug(actor, familySlug) : null;
  if (familySlug && !family) notFound();

  const currentList = family ? getCurrentFamilyCollegeList(family) : null;
  const primaryUsCollegeStudent = family ? getPrimaryUsCollegeStudent(family) : null;
  const results = isCollegeScorecardConfigured() ? await searchCollegeScorecard(filters) : null;
  const visibleResults = results?.results ?? [];
  const featuredSchool = results
    ? getFeaturedCollegeSearchResult(visibleResults, filters.selectedScorecardSchoolId)
    : null;
  const featuredSuggestion = featuredSchool
    ? suggestCollegeBucket(family?.collegeStrategyProfile, featuredSchool)
    : null;

  return (
    <div className="space-y-8">
      <section className="panel rounded-[2rem] px-6 py-8 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
              College explorer
            </p>
            <h1 className="section-title mt-3 text-4xl font-semibold">College Scorecard research explorer</h1>
            <p className="mt-4 text-base leading-8 text-[var(--muted)]">
              Search bachelor’s-dominant US institutions with consultant-friendly filters, then preview one featured school at a time before adding it into a family’s current list.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {family ? (
              <Link
                href={`/families/${family.slug}`}
                className="inline-flex rounded-full border border-[var(--border)] bg-white/70 px-5 py-3 text-sm font-semibold"
              >
                Back to family
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {family ? (
        <SectionCard
          eyebrow="Family context"
          title={family.familyLabel}
          description="Explorer actions stay family-aware when opened from a workspace."
          icon={School}
        >
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-[1.5rem] bg-white/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Primary applicant</p>
              <p className="mt-2 font-semibold">{primaryUsCollegeStudent?.studentName ?? "No US college applicant"}</p>
            </div>
            <div className="rounded-[1.5rem] bg-white/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Current list</p>
              <p className="mt-2 font-semibold">{currentList?.listName ?? "No list yet"}</p>
            </div>
            <div className="rounded-[1.5rem] bg-white/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Testing</p>
              <p className="mt-2 font-semibold">
                {family.collegeStrategyProfile?.currentSat ?? primaryUsCollegeStudent?.testingProfile?.currentSat ?? "—"}
                {family.collegeStrategyProfile?.projectedSat || primaryUsCollegeStudent?.testingProfile?.projectedSat
                  ? ` -> ${
                      family.collegeStrategyProfile?.projectedSat ??
                      primaryUsCollegeStudent?.testingProfile?.projectedSat
                    }`
                  : ""}
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-white/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Majors</p>
              <p className="mt-2 font-semibold">
                {family.collegeStrategyProfile?.intendedMajorLabels.join(" • ") || "Not set"}
              </p>
            </div>
          </div>
        </SectionCard>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Search mode"
          value="Bachelor's"
          helper="Scorecard search always scopes to bachelor’s-dominant institutions"
        />
        <MetricCard
          label="Programs"
          value={filters.programCode ? "Major-aware" : "All majors"}
          helper="Controlled CIP-4 picker, not free text"
        />
        <MetricCard
          label="Current page"
          value={String((results?.page ?? filters.page ?? 0) + 1)}
          helper={`${results?.perPage ?? filters.perPage ?? 12} schools per page`}
        />
        <MetricCard
          label="Results"
          value={String(results?.total ?? 0)}
          helper="Matches returned by the College Scorecard API"
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <SectionCard
          eyebrow="Filters"
          title="Research filter rail"
          description="Explorer state lives in the URL so searches stay shareable and deterministic."
          icon={Filter}
        >
          <form className="space-y-4">
            {family ? <input type="hidden" name="family" value={family.slug} /> : null}
            <label className="block text-sm">
              <span className="mb-2 block font-semibold text-[var(--muted)]">School name</span>
              <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-white/70 px-3 py-3">
                <Search className="h-4 w-4 text-[var(--muted)]" />
                <input
                  name="q"
                  defaultValue={filters.query ?? ""}
                  placeholder="School name"
                  className="w-full bg-transparent outline-none"
                />
              </div>
            </label>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              <label className="block text-sm">
                <span className="mb-2 block font-semibold text-[var(--muted)]">State</span>
                <input
                  name="state"
                  defaultValue={filters.state ?? ""}
                  placeholder="MA"
                  className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-2 block font-semibold text-[var(--muted)]">City</span>
                <input
                  name="city"
                  defaultValue={filters.city ?? ""}
                  placeholder="Boston"
                  className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
                />
              </label>
            </div>
            <label className="block text-sm">
              <span className="mb-2 block font-semibold text-[var(--muted)]">Major / CIP-4</span>
              <select
                name="programCode"
                defaultValue={filters.programCode ?? ""}
                className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
              >
                <option value="">All majors</option>
                {cip4Options.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-2 block font-semibold text-[var(--muted)]">Ownership</span>
              <select
                name="ownership"
                defaultValue={filters.ownership ?? "all"}
                className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
              >
                <option value="all">All ownership types</option>
                <option value="Public">Public</option>
                <option value="Private nonprofit">Private nonprofit</option>
                <option value="Private for-profit">Private for-profit</option>
              </select>
            </label>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              <label className="block text-sm">
                <span className="mb-2 block font-semibold text-[var(--muted)]">SAT min / max</span>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    name="satMin"
                    defaultValue={filters.satMin ?? ""}
                    placeholder="1350"
                    className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
                  />
                  <input
                    name="satMax"
                    defaultValue={filters.satMax ?? ""}
                    placeholder="1550"
                    className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
                  />
                </div>
              </label>
              <label className="block text-sm">
                <span className="mb-2 block font-semibold text-[var(--muted)]">Admission % min / max</span>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    name="admissionRateMin"
                    defaultValue={filters.admissionRateMin != null ? Math.round(filters.admissionRateMin * 100) : ""}
                    placeholder="5"
                    className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
                  />
                  <input
                    name="admissionRateMax"
                    defaultValue={filters.admissionRateMax != null ? Math.round(filters.admissionRateMax * 100) : ""}
                    placeholder="25"
                    className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
                  />
                </div>
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              <label className="block text-sm">
                <span className="mb-2 block font-semibold text-[var(--muted)]">Size min / max</span>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    name="sizeMin"
                    defaultValue={filters.sizeMin ?? ""}
                    placeholder="5000"
                    className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
                  />
                  <input
                    name="sizeMax"
                    defaultValue={filters.sizeMax ?? ""}
                    placeholder="30000"
                    className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
                  />
                </div>
              </label>
              <label className="block text-sm">
                <span className="mb-2 block font-semibold text-[var(--muted)]">Net price max</span>
                <input
                  name="netPriceMax"
                  defaultValue={filters.netPriceMax ?? ""}
                  placeholder="35000"
                  className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
                />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              <label className="block text-sm">
                <span className="mb-2 block font-semibold text-[var(--muted)]">Completion min %</span>
                <input
                  name="completionMin"
                  defaultValue={filters.completionMin != null ? Math.round(filters.completionMin * 100) : ""}
                  placeholder="80"
                  className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-2 block font-semibold text-[var(--muted)]">Retention min %</span>
                <input
                  name="retentionMin"
                  defaultValue={filters.retentionMin != null ? Math.round(filters.retentionMin * 100) : ""}
                  placeholder="90"
                  className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
                />
              </label>
            </div>
            <label className="block text-sm">
              <span className="mb-2 block font-semibold text-[var(--muted)]">Earnings min</span>
              <input
                name="earningsMin"
                defaultValue={filters.earningsMin ?? ""}
                placeholder="70000"
                className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              <label className="block text-sm">
                <span className="mb-2 block font-semibold text-[var(--muted)]">ZIP</span>
                <input
                  name="zip"
                  defaultValue={filters.zip ?? ""}
                  placeholder="10001"
                  className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-2 block font-semibold text-[var(--muted)]">Distance</span>
                <input
                  name="distance"
                  defaultValue={filters.distance ?? ""}
                  placeholder="25mi"
                  className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
                />
              </label>
            </div>
            <label className="block text-sm">
              <span className="mb-2 block font-semibold text-[var(--muted)]">Sort</span>
              <select
                name="sort"
                defaultValue={filters.sort ?? "name_asc"}
                className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
              >
                <option value="name_asc">Name</option>
                <option value="admission_rate_asc">Admission rate (lowest first)</option>
                <option value="admission_rate_desc">Admission rate (highest first)</option>
                <option value="sat_average_desc">SAT average</option>
                <option value="net_price_asc">Net price</option>
                <option value="earnings_desc">Earnings</option>
                <option value="completion_desc">Completion</option>
                <option value="size_desc">Student size</option>
              </select>
            </label>
            <button
              type="submit"
              className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white"
            >
              Apply filters
            </button>
          </form>
        </SectionCard>

        <SectionCard
          eyebrow="Results"
          title="Featured school preview"
          description="Select any result below to swap the editorial preview while keeping the roster fast to scan."
          icon={School}
        >
          {!isCollegeScorecardConfigured() ? (
            <div className="rounded-[1.5rem] bg-[var(--warn-soft)] p-5 text-sm leading-7 text-[var(--warn)]">
              Add `COLLEGE_SCORECARD_API_KEY` to `.env.local` to load live college data.
            </div>
          ) : results?.results.length === 0 || !featuredSchool || !featuredSuggestion ? (
            <div className="rounded-[1.5rem] bg-white/70 p-5 text-sm leading-7 text-[var(--muted)]">
              No schools matched the current filter set.
            </div>
          ) : (
            <div className="space-y-6">
              <FeaturedCollegeCard
                school={featuredSchool}
                suggestion={featuredSuggestion}
                actionSlot={
                  family && currentList ? (
                    <form action={addFamilyCollegeListItemAction} className="space-y-3">
                      <input type="hidden" name="familyId" value={family.id} />
                      <input type="hidden" name="familySlug" value={family.slug} />
                      <input type="hidden" name="familyCollegeListId" value={currentList.id} />
                      <input type="hidden" name="returnPath" value={buildCollegeSelectionHref(resolved, featuredSchool.scorecardSchoolId)} />
                      <input type="hidden" name="scorecardSchoolId" value={featuredSchool.scorecardSchoolId} />
                      <input type="hidden" name="schoolName" value={featuredSchool.schoolName} />
                      <input type="hidden" name="city" value={featuredSchool.city} />
                      <input type="hidden" name="state" value={featuredSchool.state} />
                      <input type="hidden" name="ownership" value={featuredSchool.ownership} />
                      <input type="hidden" name="studentSize" value={featuredSchool.studentSize ?? ""} />
                      <input type="hidden" name="admissionRate" value={featuredSchool.admissionRate ?? ""} />
                      <input type="hidden" name="satAverage" value={featuredSchool.satAverage ?? ""} />
                      <input type="hidden" name="completionRate" value={featuredSchool.completionRate ?? ""} />
                      <input type="hidden" name="retentionRate" value={featuredSchool.retentionRate ?? ""} />
                      <input type="hidden" name="averageNetPrice" value={featuredSchool.averageNetPrice ?? ""} />
                      <input type="hidden" name="medianEarnings" value={featuredSchool.medianEarnings ?? ""} />
                      {featuredSchool.matchedPrograms.map((program) => (
                        <input
                          key={`${program.code}-code`}
                          type="hidden"
                          name="matchedProgramCodes"
                          value={program.code}
                        />
                      ))}
                      {featuredSchool.matchedPrograms.map((program) => (
                        <input
                          key={`${program.code}-label`}
                          type="hidden"
                          name="matchedProgramLabels"
                          value={program.title}
                        />
                      ))}
                      <input type="hidden" name="bucket" value={featuredSuggestion.bucket} />
                      <input type="hidden" name="bucketSource" value="system" />
                      <input type="hidden" name="fitScore" value={featuredSuggestion.fitScore} />
                      <input type="hidden" name="fitRationale" value={featuredSuggestion.fitRationale} />
                      <button
                        type="submit"
                        className="w-full rounded-full bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white"
                      >
                        Add to {currentList.listName}
                      </button>
                      <p className="text-sm text-[var(--muted)]">
                        The selected preview stays family-aware, so adding from here writes into the active family list without losing the current search state.
                      </p>
                    </form>
                  ) : family ? (
                    <div className="rounded-[1rem] bg-white p-3 text-sm text-[var(--muted)]">
                      Create a current named list in the family workspace to enable add actions.
                    </div>
                  ) : (
                    <div className="rounded-[1rem] bg-white p-3 text-sm text-[var(--muted)]">
                      Open this explorer from a family workspace to add the selected school directly into a list.
                    </div>
                  )
                }
              />

              <div className="space-y-3">
                {visibleResults.map((school) => {
                  const suggestion = suggestCollegeBucket(family?.collegeStrategyProfile, school);
                  const isSelected = school.scorecardSchoolId === featuredSchool.scorecardSchoolId;

                  return (
                    <Link
                      key={school.scorecardSchoolId}
                      href={buildCollegeSelectionHref(resolved, school.scorecardSchoolId)}
                      className={`block rounded-[1.6rem] border p-4 transition ${
                        isSelected
                          ? "border-[var(--accent)] bg-[var(--accent-soft)]/55 shadow-[0_16px_32px_rgba(31,45,39,0.08)]"
                          : "border-[var(--border)] bg-white/68 hover:bg-white/86"
                      }`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-xl font-semibold">{school.schoolName}</h3>
                            <span
                              className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
                              style={{
                                backgroundColor:
                                  suggestion.bucket === "likely"
                                    ? "var(--success-soft)"
                                    : suggestion.bucket === "target"
                                      ? "var(--warn-soft)"
                                      : "var(--danger-soft)",
                                color:
                                  suggestion.bucket === "likely"
                                    ? "var(--success)"
                                    : suggestion.bucket === "target"
                                      ? "var(--warn)"
                                      : "var(--danger)",
                              }}
                            >
                              {suggestion.bucket} • fit {suggestion.fitScore}
                            </span>
                            {isSelected ? (
                              <span className="rounded-full border border-[var(--accent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                                Featured
                              </span>
                            ) : null}
                          </div>
                          <p className="text-sm text-[var(--muted)]">
                            {school.city}, {school.state} • {school.ownership}
                          </p>
                          <div className="flex flex-wrap gap-4 text-sm text-[var(--muted)]">
                            <span>Admission {formatCollegePercent(school.admissionRate)}</span>
                            <span>SAT {school.satAverage ?? "—"}</span>
                            <span>Tuition {formatCollegeMoney(school.tuitionStickerPrice)}</span>
                            <span>Completion {formatCollegePercent(school.completionRate)}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-4 lg:min-w-[180px] lg:justify-end">
                          <p className="max-w-sm text-sm leading-7 text-[var(--muted)]">
                            {suggestion.fitRationale}
                          </p>
                          <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)]">
                            Preview
                            <ChevronRight className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
