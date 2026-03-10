import Link from "next/link";
import { notFound } from "next/navigation";
import { Files, MessageSquare, Plus, School, Users } from "lucide-react";
import { FlashBanner } from "@/components/shared/flash-banner";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  addFamilyCollegeListItemAction,
  createFamilyCollegeListAction,
  removeFamilyCollegeListItemAction,
  saveArtifactLinkAction,
  saveFamilyCollegeStrategyProfileAction,
  saveDecisionAction,
  saveNoteAction,
  setCurrentFamilyCollegeListAction,
  updateFamilyCollegeListItemAction,
} from "@/app/families/actions";
import { isSupabaseConfigured } from "@/lib/auth/config";
import { formatRoleLabel } from "@/lib/auth/roles";
import { requireInternalAccess } from "@/lib/auth/session";
import { getInternalFamilyBySlug } from "@/lib/db/queries";
import {
  formatCollegeMoney,
  formatCollegePercent,
  getCurrentFamilyCollegeList,
  getPrimaryUsCollegeStudent,
  groupCollegeListItemsByBucket,
  isCollegeScorecardConfigured,
  searchCollegeScorecard,
  suggestCollegeBucket,
} from "@/lib/domain/college-scorecard";
import { cip4Options } from "@/lib/domain/cip4";
import {
  formatDisplayDate,
  getFamilyLatestNotes,
  getFamilyPendingItems,
  getLatestSummary,
  getStudentCountsLabel,
} from "@/lib/domain/dashboard";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getStringValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function HiddenProgramInputs({
  codes,
  labels,
}: {
  codes: string[];
  labels: string[];
}) {
  return (
    <>
      {codes.map((code) => (
        <input key={`code-${code}`} type="hidden" name="matchedProgramCodes" value={code} />
      ))}
      {labels.map((label) => (
        <input key={`label-${label}`} type="hidden" name="matchedProgramLabels" value={label} />
      ))}
    </>
  );
}

export default async function FamilyDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const actor = await requireInternalAccess(`/families/${id}`);
  const family = await getInternalFamilyBySlug(actor, id);

  if (!family) notFound();

  const resolved = await searchParams;
  const message = getStringValue(resolved.message);
  const error = getStringValue(resolved.error);
  const pendingItems = getFamilyPendingItems(family);
  const latestNotes = getFamilyLatestNotes(family);
  const primaryUsCollegeStudent = getPrimaryUsCollegeStudent(family);
  const currentCollegeList = getCurrentFamilyCollegeList(family);
  const groupedCollegeListItems = currentCollegeList
    ? groupCollegeListItemsByBucket(currentCollegeList.items)
    : { reach: [], target: [], likely: [] };
  const quickAddResults =
    primaryUsCollegeStudent && isCollegeScorecardConfigured()
      ? await searchCollegeScorecard({
          programCode: family.collegeStrategyProfile?.intendedMajorCodes[0],
          sort: "earnings_desc",
          perPage: 4,
        })
      : null;
  const strategyProfile = family.collegeStrategyProfile;
  const collegeWritesEnabled = isSupabaseConfigured();

  return (
    <div className="space-y-8">
      <section className="panel rounded-[2rem] px-6 py-8 md:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-4xl space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
              Family workspace
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="section-title text-4xl font-semibold">{family.familyLabel}</h1>
              <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                {getStudentCountsLabel(family)}
              </span>
            </div>
            <p className="text-sm text-[var(--muted)]">
              Parent lead: {family.parentContactName} • {family.strategistOwnerName} / {family.opsOwnerName}
            </p>
            <p className="text-sm text-[var(--muted)]">Current mode: {formatRoleLabel(actor.activeRole)}</p>
            <p className="max-w-3xl text-base leading-8 text-[var(--muted)]">
              This workspace keeps family-wide coordination visible while routing strategy work into individual student portfolios.
            </p>
          </div>
          <div className="space-y-3 rounded-[1.75rem] bg-white/70 p-5 text-sm text-[var(--muted)]">
            <p>Created: {formatDisplayDate(family.createdDate)}</p>
            <p>Updated: {formatDisplayDate(family.lastUpdatedDate)}</p>
            <p>Contacts: {family.contacts.length}</p>
            <Link
              href={`/students/new?family=${family.slug}`}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              Add student
            </Link>
          </div>
        </div>
      </section>

      <FlashBanner message={message} error={error} />

      <SectionCard
        eyebrow="Students"
        title="Student roster"
        description="Each student keeps their own posture, tasks, testing, and school list inside the portfolio workspace."
        icon={Users}
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {family.students.map((student) => {
            const latestSummary = getLatestSummary(student);

            return (
              <article key={student.id} className="rounded-[1.75rem] border border-[var(--border)] bg-white/70 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-semibold">{student.studentName}</h2>
                      <StatusBadge status={student.overallStatus} />
                    </div>
                    <p className="text-sm text-[var(--muted)]">
                      {student.gradeLevel} • {student.currentPhase} • {student.tier}
                    </p>
                    <p className="text-sm text-[var(--muted)]">
                      {student.pathway.replace("_", " ")} •{" "}
                      {student.testingProfile?.currentSat
                        ? `SAT ${student.testingProfile.currentSat}`
                        : student.testingProfile?.currentAct
                          ? `ACT ${student.testingProfile.currentAct}`
                          : "No testing baseline yet"}
                    </p>
                    <p className="text-sm leading-7 text-[var(--muted)]">
                      {latestSummary?.biggestRisk ?? student.statusReason}
                    </p>
                  </div>
                  <div className="space-y-2 text-sm text-[var(--muted)] lg:text-right">
                    <p>Tasks: {student.tasks.length}</p>
                    <p>Decisions: {student.decisionLogItems.length}</p>
                    <p>Schools: {student.schoolTargets.length}</p>
                    <Link
                      href={`/students/${student.slug}`}
                      className="inline-flex rounded-full bg-[var(--accent)] px-4 py-2 font-semibold text-white"
                    >
                      Open student 360
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="College strategy"
        title="College research and school list workbench"
        description="Internal-only US college planning stays attached to the family workspace while the deeper search surface lives in the standalone explorer."
        icon={School}
      >
        {!primaryUsCollegeStudent ? (
          <div className="rounded-[1.5rem] bg-white/70 p-5 text-sm leading-7 text-[var(--muted)]">
            College Scorecard workbench is only enabled for US college applicants in v1.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[1.75rem] bg-white/70 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                      Primary applicant
                    </p>
                    <p className="mt-2 text-xl font-semibold">{primaryUsCollegeStudent.studentName}</p>
                    <p className="text-sm text-[var(--muted)]">
                      {primaryUsCollegeStudent.gradeLevel} • {primaryUsCollegeStudent.currentPhase}
                    </p>
                  </div>
                  <Link
                    href={`/colleges?family=${family.slug}`}
                    className="inline-flex rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
                  >
                    Open explorer
                  </Link>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[1.25rem] bg-[var(--background-soft)] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Current SAT</p>
                    <p className="mt-2 font-semibold">
                      {strategyProfile?.currentSat ?? primaryUsCollegeStudent.testingProfile?.currentSat ?? "—"}
                    </p>
                  </div>
                  <div className="rounded-[1.25rem] bg-[var(--background-soft)] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Projected SAT</p>
                    <p className="mt-2 font-semibold">
                      {strategyProfile?.projectedSat ?? primaryUsCollegeStudent.testingProfile?.projectedSat ?? "—"}
                    </p>
                  </div>
                  <div className="rounded-[1.25rem] bg-[var(--background-soft)] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Current list</p>
                    <p className="mt-2 font-semibold">{currentCollegeList?.listName ?? "No list yet"}</p>
                  </div>
                  <div className="rounded-[1.25rem] bg-[var(--background-soft)] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Intended majors</p>
                    <p className="mt-2 font-semibold">
                      {strategyProfile?.intendedMajorLabels.join(" • ") || "Not set yet"}
                    </p>
                  </div>
                </div>
                {!collegeWritesEnabled ? (
                  <p className="mt-4 rounded-[1.25rem] bg-[var(--warn-soft)] px-4 py-3 text-sm text-[var(--warn)]">
                    Demo mode can browse live College Scorecard data, but saved lists remain read-only until Supabase is configured.
                  </p>
                ) : null}
                <details className="mt-5 rounded-[1.5rem] bg-[var(--background-soft)] p-4">
                  <summary className="cursor-pointer font-semibold">Edit family college strategy</summary>
                  <form action={saveFamilyCollegeStrategyProfileAction} className="mt-4 space-y-4">
                    <input type="hidden" name="familyId" value={family.id} />
                    <input type="hidden" name="familySlug" value={family.slug} />
                    <input type="hidden" name="returnPath" value={`/families/${family.slug}`} />
                    <div className="grid gap-4 md:grid-cols-2">
                      <input
                        type="number"
                        min="0"
                        max="1600"
                        name="currentSat"
                        defaultValue={
                          strategyProfile?.currentSat ?? primaryUsCollegeStudent.testingProfile?.currentSat ?? ""
                        }
                        placeholder="Current SAT"
                        className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
                      />
                      <input
                        type="number"
                        min="0"
                        max="1600"
                        name="projectedSat"
                        defaultValue={
                          strategyProfile?.projectedSat ??
                          primaryUsCollegeStudent.testingProfile?.projectedSat ??
                          ""
                        }
                        placeholder="Projected SAT"
                        className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
                      />
                      <input
                        type="number"
                        min="0"
                        max="36"
                        name="currentAct"
                        defaultValue={strategyProfile?.currentAct ?? primaryUsCollegeStudent.testingProfile?.currentAct ?? ""}
                        placeholder="Current ACT"
                        className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
                      />
                      <input
                        type="number"
                        min="0"
                        max="36"
                        name="projectedAct"
                        defaultValue={
                          strategyProfile?.projectedAct ?? primaryUsCollegeStudent.testingProfile?.projectedAct ?? ""
                        }
                        placeholder="Projected ACT"
                        className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
                      />
                    </div>
                    <label className="block text-sm">
                      <span className="mb-2 block font-semibold text-[var(--muted)]">Intended majors</span>
                      <select
                        name="intendedMajorCodes"
                        defaultValue={strategyProfile?.intendedMajorCodes ?? []}
                        multiple
                        className="min-h-44 w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
                      >
                        {cip4Options.map((option) => (
                          <option key={option.code} value={option.code}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <textarea
                      name="strategyNote"
                      rows={3}
                      defaultValue={
                        strategyProfile?.strategyNote ?? primaryUsCollegeStudent.testingProfile?.strategyNote ?? ""
                      }
                      placeholder="Counselor strategy note"
                      className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!collegeWritesEnabled}
                      className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Save college strategy
                    </button>
                  </form>
                </details>
              </div>

              <div className="rounded-[1.75rem] bg-white/70 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                      Named lists
                    </p>
                    <p className="mt-2 text-xl font-semibold">
                      {family.collegeLists.length} saved list{family.collegeLists.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {family.collegeLists.length === 0 ? (
                    <div className="rounded-[1.25rem] bg-[var(--background-soft)] px-4 py-3 text-sm text-[var(--muted)]">
                      No family college list has been created yet.
                    </div>
                  ) : (
                    family.collegeLists.map((list) => (
                      <div
                        key={list.id}
                        className="flex items-center justify-between gap-3 rounded-[1.25rem] border border-[var(--border)] bg-[var(--background-soft)] px-4 py-3"
                      >
                        <div>
                          <p className="font-semibold">{list.listName}</p>
                          <p className="text-sm text-[var(--muted)]">{list.items.length} schools</p>
                        </div>
                        {list.isCurrent ? (
                          <span className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                            Current
                          </span>
                        ) : (
                          <form action={setCurrentFamilyCollegeListAction}>
                            <input type="hidden" name="familyId" value={family.id} />
                            <input type="hidden" name="familySlug" value={family.slug} />
                            <input type="hidden" name="familyCollegeListId" value={list.id} />
                            <input type="hidden" name="returnPath" value={`/families/${family.slug}`} />
                            <button
                              type="submit"
                              disabled={!collegeWritesEnabled}
                              className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Set current
                            </button>
                          </form>
                        )}
                      </div>
                    ))
                  )}
                </div>
                <details className="mt-5 rounded-[1.5rem] bg-[var(--background-soft)] p-4">
                  <summary className="cursor-pointer font-semibold">Create named list</summary>
                  <form action={createFamilyCollegeListAction} className="mt-4 space-y-4">
                    <input type="hidden" name="familyId" value={family.id} />
                    <input type="hidden" name="familySlug" value={family.slug} />
                    <input type="hidden" name="returnPath" value={`/families/${family.slug}`} />
                    <input
                      name="listName"
                      placeholder="List name"
                      className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
                    />
                    <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
                      <input type="checkbox" name="setCurrent" defaultChecked />
                      Make this the current list
                    </label>
                    <button
                      type="submit"
                      disabled={!collegeWritesEnabled}
                      className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Create list
                    </button>
                  </form>
                </details>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-4">
                <div className="grid gap-4 xl:grid-cols-3">
                  {[
                    { key: "reach" as const, title: "Reach", items: groupedCollegeListItems.reach },
                    { key: "target" as const, title: "Target", items: groupedCollegeListItems.target },
                    { key: "likely" as const, title: "Likely", items: groupedCollegeListItems.likely },
                  ].map((column) => (
                    <div key={column.key} className="rounded-[1.75rem] bg-[var(--background-soft)] p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="font-semibold">{column.title}</h3>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                          {column.items.length}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {column.items.length === 0 ? (
                          <div className="rounded-[1.25rem] bg-white/70 p-4 text-sm text-[var(--muted)]">
                            No schools in this bucket yet.
                          </div>
                        ) : (
                          column.items.map((item) => {
                            const suggestion = suggestCollegeBucket(strategyProfile, {
                              scorecardSchoolId: item.scorecardSchoolId,
                              schoolName: item.schoolName,
                              city: item.city,
                              state: item.state,
                              ownership: item.ownership,
                              studentSize: item.studentSize,
                              admissionRate: item.admissionRate,
                              satAverage: item.satAverage,
                              completionRate: item.completionRate,
                              retentionRate: item.retentionRate,
                              averageNetPrice: item.averageNetPrice,
                              medianEarnings: item.medianEarnings,
                              matchedPrograms: item.matchedProgramCodes.map((code, index) => ({
                                code,
                                title: item.matchedProgramLabels[index] ?? code,
                              })),
                            });

                            return (
                              <div key={item.id} className="rounded-[1.25rem] bg-white p-4 shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-semibold">{item.schoolName}</p>
                                    <p className="text-sm text-[var(--muted)]">
                                      {item.city}, {item.state}
                                    </p>
                                  </div>
                                  <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                                    {item.fitScore}
                                  </span>
                                </div>
                                <div className="mt-3 grid gap-2 text-sm text-[var(--muted)]">
                                  <p>Admission: {formatCollegePercent(item.admissionRate)}</p>
                                  <p>SAT avg: {item.satAverage ?? "—"}</p>
                                  <p>Net price: {formatCollegeMoney(item.averageNetPrice)}</p>
                                </div>
                                {item.matchedProgramLabels.length > 0 ? (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {item.matchedProgramLabels.map((program) => (
                                      <span
                                        key={`${item.id}-${program}`}
                                        className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]"
                                      >
                                        {program}
                                      </span>
                                    ))}
                                  </div>
                                ) : null}
                                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                                  {item.fitRationale}
                                </p>
                                {item.counselorNote ? (
                                  <p className="mt-3 rounded-[1rem] bg-[var(--background-soft)] px-3 py-2 text-sm text-[var(--muted)]">
                                    {item.counselorNote}
                                  </p>
                                ) : null}
                                <details className="mt-3 rounded-[1rem] bg-[var(--background-soft)] p-3">
                                  <summary className="cursor-pointer text-sm font-semibold">Adjust item</summary>
                                  <form action={updateFamilyCollegeListItemAction} className="mt-3 space-y-3">
                                    <input type="hidden" name="familyId" value={family.id} />
                                    <input type="hidden" name="familySlug" value={family.slug} />
                                    <input type="hidden" name="familyCollegeListItemId" value={item.id} />
                                    <input type="hidden" name="returnPath" value={`/families/${family.slug}`} />
                                    <input type="hidden" name="scorecardSchoolId" value={item.scorecardSchoolId} />
                                    <input type="hidden" name="schoolName" value={item.schoolName} />
                                    <input type="hidden" name="city" value={item.city} />
                                    <input type="hidden" name="state" value={item.state} />
                                    <input type="hidden" name="ownership" value={item.ownership} />
                                    <input type="hidden" name="studentSize" value={item.studentSize ?? ""} />
                                    <input type="hidden" name="admissionRate" value={item.admissionRate ?? ""} />
                                    <input type="hidden" name="satAverage" value={item.satAverage ?? ""} />
                                    <input type="hidden" name="completionRate" value={item.completionRate ?? ""} />
                                    <input type="hidden" name="retentionRate" value={item.retentionRate ?? ""} />
                                    <input type="hidden" name="averageNetPrice" value={item.averageNetPrice ?? ""} />
                                    <input type="hidden" name="medianEarnings" value={item.medianEarnings ?? ""} />
                                    <HiddenProgramInputs
                                      codes={item.matchedProgramCodes}
                                      labels={item.matchedProgramLabels}
                                    />
                                    <input type="hidden" name="fitScore" value={item.fitScore} />
                                    <input type="hidden" name="fitRationale" value={item.fitRationale} />
                                    <input type="hidden" name="sortOrder" value={item.sortOrder} />
                                    <label className="block text-sm">
                                      <span className="mb-2 block font-semibold text-[var(--muted)]">Bucket</span>
                                      <select
                                        name="bucket"
                                        defaultValue={item.bucket}
                                        className="w-full rounded-2xl border border-[var(--border)] bg-white px-3 py-2 outline-none"
                                      >
                                        <option value="reach">Reach</option>
                                        <option value="target">Target</option>
                                        <option value="likely">Likely</option>
                                      </select>
                                    </label>
                                    <input type="hidden" name="bucketSource" value="counselor" />
                                    <textarea
                                      name="counselorNote"
                                      rows={3}
                                      defaultValue={item.counselorNote ?? ""}
                                      placeholder="Counselor note"
                                      className="w-full rounded-2xl border border-[var(--border)] bg-white px-3 py-2 outline-none"
                                    />
                                    <button
                                      type="submit"
                                      disabled={!collegeWritesEnabled}
                                      className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      Save item
                                    </button>
                                  </form>
                                </details>
                                <form action={updateFamilyCollegeListItemAction} className="mt-3">
                                  <input type="hidden" name="familyId" value={family.id} />
                                  <input type="hidden" name="familySlug" value={family.slug} />
                                  <input type="hidden" name="familyCollegeListItemId" value={item.id} />
                                  <input type="hidden" name="returnPath" value={`/families/${family.slug}`} />
                                  <input type="hidden" name="scorecardSchoolId" value={item.scorecardSchoolId} />
                                  <input type="hidden" name="schoolName" value={item.schoolName} />
                                  <input type="hidden" name="city" value={item.city} />
                                  <input type="hidden" name="state" value={item.state} />
                                  <input type="hidden" name="ownership" value={item.ownership} />
                                  <input type="hidden" name="studentSize" value={item.studentSize ?? ""} />
                                  <input type="hidden" name="admissionRate" value={item.admissionRate ?? ""} />
                                  <input type="hidden" name="satAverage" value={item.satAverage ?? ""} />
                                  <input type="hidden" name="completionRate" value={item.completionRate ?? ""} />
                                  <input type="hidden" name="retentionRate" value={item.retentionRate ?? ""} />
                                  <input type="hidden" name="averageNetPrice" value={item.averageNetPrice ?? ""} />
                                  <input type="hidden" name="medianEarnings" value={item.medianEarnings ?? ""} />
                                  <HiddenProgramInputs
                                    codes={item.matchedProgramCodes}
                                    labels={item.matchedProgramLabels}
                                  />
                                  <input
                                    type="hidden"
                                    name="bucket"
                                    value={item.bucketSource === "counselor" ? item.bucket : suggestion.bucket}
                                  />
                                  <input
                                    type="hidden"
                                    name="bucketSource"
                                    value={item.bucketSource === "counselor" ? "counselor" : "system"}
                                  />
                                  <input type="hidden" name="fitScore" value={suggestion.fitScore} />
                                  <input type="hidden" name="fitRationale" value={suggestion.fitRationale} />
                                  <input type="hidden" name="counselorNote" value={item.counselorNote ?? ""} />
                                  <input type="hidden" name="sortOrder" value={item.sortOrder} />
                                  <button
                                    type="submit"
                                    disabled={!collegeWritesEnabled}
                                    className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    Refresh suggestion
                                  </button>
                                </form>
                                <form action={removeFamilyCollegeListItemAction} className="mt-2">
                                  <input type="hidden" name="familyId" value={family.id} />
                                  <input type="hidden" name="familySlug" value={family.slug} />
                                  <input type="hidden" name="familyCollegeListItemId" value={item.id} />
                                  <input type="hidden" name="returnPath" value={`/families/${family.slug}`} />
                                  <button
                                    type="submit"
                                    disabled={!collegeWritesEnabled}
                                    className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    Remove from list
                                  </button>
                                </form>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.75rem] bg-white/70 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Quick add drawer
                </p>
                <h3 className="mt-2 text-xl font-semibold">Suggested research hits</h3>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                  This compact drawer uses the same College Scorecard search helper as the standalone explorer.
                </p>
                {!isCollegeScorecardConfigured() ? (
                  <p className="mt-4 rounded-[1.25rem] bg-[var(--warn-soft)] px-4 py-3 text-sm text-[var(--warn)]">
                    Add `COLLEGE_SCORECARD_API_KEY` to browse live college results here.
                  </p>
                ) : currentCollegeList == null ? (
                  <p className="mt-4 rounded-[1.25rem] bg-[var(--background-soft)] px-4 py-3 text-sm text-[var(--muted)]">
                    Create a named list first, then add schools from the explorer or this drawer.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {quickAddResults?.results.map((school) => {
                      const suggestion = suggestCollegeBucket(strategyProfile, school);
                      return (
                        <div key={school.scorecardSchoolId} className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--background-soft)] p-4">
                          <p className="font-semibold">{school.schoolName}</p>
                          <p className="mt-1 text-sm text-[var(--muted)]">
                            {school.city}, {school.state} • {formatCollegePercent(school.admissionRate)} admit
                          </p>
                          <p className="mt-1 text-sm text-[var(--muted)]">
                            SAT {school.satAverage ?? "—"} • {formatCollegeMoney(school.averageNetPrice)}
                          </p>
                          {school.matchedPrograms.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {school.matchedPrograms.map((program) => (
                                <span
                                  key={`${school.scorecardSchoolId}-${program.code}`}
                                  className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]"
                                >
                                  {program.title}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{suggestion.fitRationale}</p>
                          <form action={addFamilyCollegeListItemAction} className="mt-3">
                            <input type="hidden" name="familyId" value={family.id} />
                            <input type="hidden" name="familySlug" value={family.slug} />
                            <input type="hidden" name="familyCollegeListId" value={currentCollegeList.id} />
                            <input type="hidden" name="returnPath" value={`/families/${family.slug}`} />
                            <input type="hidden" name="scorecardSchoolId" value={school.scorecardSchoolId} />
                            <input type="hidden" name="schoolName" value={school.schoolName} />
                            <input type="hidden" name="city" value={school.city} />
                            <input type="hidden" name="state" value={school.state} />
                            <input type="hidden" name="ownership" value={school.ownership} />
                            <input type="hidden" name="studentSize" value={school.studentSize ?? ""} />
                            <input type="hidden" name="admissionRate" value={school.admissionRate ?? ""} />
                            <input type="hidden" name="satAverage" value={school.satAverage ?? ""} />
                            <input type="hidden" name="completionRate" value={school.completionRate ?? ""} />
                            <input type="hidden" name="retentionRate" value={school.retentionRate ?? ""} />
                            <input type="hidden" name="averageNetPrice" value={school.averageNetPrice ?? ""} />
                            <input type="hidden" name="medianEarnings" value={school.medianEarnings ?? ""} />
                            <HiddenProgramInputs
                              codes={school.matchedPrograms.map((item) => item.code)}
                              labels={school.matchedPrograms.map((item) => item.title)}
                            />
                            <input type="hidden" name="bucket" value={suggestion.bucket} />
                            <input type="hidden" name="bucketSource" value="system" />
                            <input type="hidden" name="fitScore" value={suggestion.fitScore} />
                            <input type="hidden" name="fitRationale" value={suggestion.fitRationale} />
                            <button
                              type="submit"
                              disabled={!collegeWritesEnabled}
                              className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Add to current list
                            </button>
                          </form>
                        </div>
                      );
                    })}
                    <Link
                      href={`/colleges?family=${family.slug}`}
                      className="inline-flex rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold"
                    >
                      Open full explorer
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <SectionCard
          eyebrow="Attention now"
          title="Pending family input"
          description="Family-wide and student-level decisions that still need household confirmation."
          icon={MessageSquare}
        >
          <div className="space-y-3">
            {pendingItems.length === 0 ? (
              <div className="rounded-[1.5rem] bg-white/70 p-4 text-sm text-[var(--muted)]">
                No family-input items are currently pending.
              </div>
            ) : (
              pendingItems.map((item) => (
                <div key={item.id} className="rounded-[1.5rem] bg-white/70 p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-semibold">{item.decisionType}</p>
                    <StatusBadge status="yellow" />
                  </div>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{item.summary}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                    {formatDisplayDate(item.date)} • {item.owner}
                  </p>
                </div>
              ))
            )}
          </div>
          <details className="mt-5 rounded-[1.5rem] bg-[var(--background-soft)] p-4">
            <summary className="cursor-pointer font-semibold">Log family-level decision</summary>
            <form action={saveDecisionAction} className="mt-4 space-y-4">
              <input type="hidden" name="familyId" value={family.id} />
              <input type="hidden" name="familySlug" value={family.slug} />
              <input type="hidden" name="returnPath" value={`/families/${family.slug}`} />
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  type="date"
                  name="date"
                  defaultValue={family.lastUpdatedDate}
                  className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
                />
                <input
                  name="decisionType"
                  placeholder="Decision type"
                  className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
                />
              </div>
              <textarea
                name="summary"
                rows={3}
                placeholder="Decision summary"
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
              />
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  name="owner"
                  placeholder="Owner"
                  className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
                />
                <select
                  name="status"
                  defaultValue="pending"
                  className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
                >
                  <option value="pending">Pending</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
                <input type="checkbox" name="pendingFamilyInput" defaultChecked />
                Pending family input
              </label>
              <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
                <input type="checkbox" name="parentVisible" defaultChecked />
                Parent visible
              </label>
              <button
                type="submit"
                disabled={!isSupabaseConfigured()}
                className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Save family decision
              </button>
            </form>
          </details>
        </SectionCard>

        <SectionCard
          eyebrow="Notes"
          title="Latest family coordination notes"
          description="Recent notes across the household, regardless of which student generated them."
          icon={MessageSquare}
        >
          <div className="space-y-3">
            {latestNotes.map((note) => (
              <div key={note.id} className="rounded-[1.5rem] border border-[var(--border)] bg-white/70 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-semibold">{note.summary}</p>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                    {note.visibility}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{note.body}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                  {note.authorRole.replace("_", " ")} • {formatDisplayDate(note.date)}
                </p>
              </div>
            ))}
          </div>
          <details className="mt-5 rounded-[1.5rem] bg-[var(--background-soft)] p-4">
            <summary className="cursor-pointer font-semibold">Log family note</summary>
            <form action={saveNoteAction} className="mt-4 space-y-4">
              <input type="hidden" name="familyId" value={family.id} />
              <input type="hidden" name="familySlug" value={family.slug} />
              <input type="hidden" name="returnPath" value={`/families/${family.slug}`} />
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  type="date"
                  name="date"
                  defaultValue={family.lastUpdatedDate}
                  className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
                />
                <select
                  name="authorRole"
                  defaultValue="strategist"
                  className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
                >
                  <option value="strategist">Strategist</option>
                  <option value="ops">Ops</option>
                  <option value="tutor_input">Tutor input</option>
                  <option value="mentor_input">Mentor input</option>
                </select>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  name="noteType"
                  placeholder="Note type"
                  className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
                />
                <select
                  name="visibility"
                  defaultValue="internal"
                  className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
                >
                  <option value="internal">Internal</option>
                  <option value="parent">Parent</option>
                </select>
              </div>
              <input
                name="summary"
                placeholder="Note summary"
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
              />
              <textarea
                name="body"
                rows={4}
                placeholder="Detailed note"
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
              />
              <button
                type="submit"
                disabled={!isSupabaseConfigured()}
                className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Save family note
              </button>
            </form>
          </details>
        </SectionCard>
      </section>

      <SectionCard
        eyebrow="Artifacts"
        title="Family-wide resources"
        description="Google Drive remains the source of truth; the workspace stores metadata and quick access links."
        icon={Files}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {family.artifactLinks.length === 0 ? (
            <div className="rounded-[1.5rem] bg-white/70 p-4 text-sm text-[var(--muted)]">
              No family-wide artifacts yet.
            </div>
          ) : (
            family.artifactLinks.map((artifact) => (
              <a
                key={artifact.id}
                href={artifact.linkUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-[1.5rem] border border-[var(--border)] bg-white/70 p-4 transition hover:bg-white"
              >
                <p className="font-semibold">{artifact.artifactName}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {artifact.artifactType.replace("_", " ")} • {artifact.owner}
                </p>
              </a>
            ))
          )}
        </div>
        <details className="mt-5 rounded-[1.5rem] bg-[var(--background-soft)] p-4">
          <summary className="cursor-pointer font-semibold">Add family artifact</summary>
          <form action={saveArtifactLinkAction} className="mt-4 space-y-4">
            <input type="hidden" name="familyId" value={family.id} />
            <input type="hidden" name="familySlug" value={family.slug} />
            <input type="hidden" name="returnPath" value={`/families/${family.slug}`} />
            <div className="grid gap-4 md:grid-cols-2">
              <input
                name="artifactName"
                placeholder="Artifact name"
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
              />
              <select
                name="artifactType"
                defaultValue="drive_folder"
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
              >
                <option value="drive_folder">Drive folder</option>
                <option value="doc">Doc</option>
                <option value="sheet">Sheet</option>
                <option value="slide">Slide</option>
                <option value="external_link">External link</option>
              </select>
            </div>
            <input
              name="linkUrl"
              placeholder="https://..."
              className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
            />
            <div className="grid gap-4 md:grid-cols-2">
              <input
                type="date"
                name="uploadDate"
                defaultValue={family.lastUpdatedDate}
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
              />
              <input
                name="owner"
                placeholder="Owner"
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <input type="checkbox" name="parentVisible" />
              Parent visible
            </label>
            <button
              type="submit"
              disabled={!isSupabaseConfigured()}
              className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save family artifact
            </button>
          </form>
        </details>
      </SectionCard>
    </div>
  );
}
