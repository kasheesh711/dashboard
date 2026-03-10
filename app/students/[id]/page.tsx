import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity,
  BookMarked,
  CalendarClock,
  ChevronRight,
  Files,
  GraduationCap,
  MessageSquare,
  School,
  Sparkles,
  Trophy,
} from "lucide-react";
import { FlashBanner } from "@/components/shared/flash-banner";
import { MetricCard } from "@/components/shared/metric-card";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  saveAcademicUpdateAction,
  saveArtifactLinkAction,
  saveDecisionAction,
  saveMonthlySummaryAction,
  saveNoteAction,
  saveProfileUpdateAction,
  saveStudentActivityAction,
  saveStudentCompetitionAction,
  saveStudentSchoolTargetAction,
  saveTaskAction,
  saveTestingProfileAction,
} from "@/app/families/actions";
import { isSupabaseConfigured } from "@/lib/auth/config";
import { formatRoleLabel } from "@/lib/auth/roles";
import { requireInternalAccess } from "@/lib/auth/session";
import { getStudentPortfolioBySlug } from "@/lib/db/queries";
import {
  computeTaskStatus,
  formatDisplayDate,
  getLatestAcademicUpdate,
  getLatestProfileUpdate,
  getLatestSummary,
  getSummaryHistory,
} from "@/lib/domain/dashboard";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getStringValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getSchoolFitRecommendation(currentSat?: number, projectedSat?: number, targets = 0, likely = 0) {
  const bestScore = projectedSat ?? currentSat;
  if (!bestScore) return "Add a testing baseline before expanding the school list.";
  if (bestScore >= 1500) {
    return targets < 3 ? "Testing supports one more ambitious target or reach." : "Hold the current mix and improve differentiation evidence.";
  }
  if (bestScore >= 1450) {
    return likely < 2 ? "Add one more likely school to protect the list." : "Keep the spread and refine fit notes.";
  }
  if (bestScore >= 1380) {
    return "Increase the likely bucket while narrative strength catches up.";
  }
  return "Reduce score-dependent reaches and prioritize list balance.";
}

export default async function StudentDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const actor = await requireInternalAccess(`/students/${id}`);
  const portfolio = await getStudentPortfolioBySlug(actor, id);

  if (!portfolio) notFound();

  const { family, student, familyWideArtifacts, familyWideDecisions, familyWideNotes } = portfolio;
  const resolved = await searchParams;
  const message = getStringValue(resolved.message);
  const error = getStringValue(resolved.error);
  const latestSummary = getLatestSummary(student);
  const summaryHistory = getSummaryHistory(student);
  const academicUpdate = getLatestAcademicUpdate(student);
  const profileUpdate = getLatestProfileUpdate(student);
  const reachCount = student.schoolTargets.filter((item) => item.bucket === "reach").length;
  const targetCount = student.schoolTargets.filter((item) => item.bucket === "target").length;
  const likelyCount = student.schoolTargets.filter((item) => item.bucket === "likely").length;
  const returnPath = `/students/${student.slug}`;

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[300px_1fr]">
        <div className="panel rounded-[2rem] p-6">
          <div className="rounded-[1.75rem] bg-white/70 p-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-[var(--accent)] text-xl font-semibold text-white">
              {student.studentName
                .split(" ")
                .slice(0, 2)
                .map((part) => part[0])
                .join("")}
            </div>
            <h1 className="section-title mt-4 text-3xl font-semibold">{student.studentName}</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">{family.familyLabel}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusBadge status={student.overallStatus} />
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                {student.gradeLevel}
              </span>
            </div>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{student.statusReason}</p>
          </div>

          <div className="mt-5 space-y-3">
            {[
              { icon: GraduationCap, label: "Overview" },
              { icon: BookMarked, label: "Academics" },
              { icon: Activity, label: "Activities" },
              { icon: Trophy, label: "Competitions" },
              { icon: School, label: "School list" },
              { icon: CalendarClock, label: "Deadlines" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-[1.25rem] border border-[var(--border)] bg-white/70 px-3 py-3">
                <div className="flex items-center gap-3">
                  <item.icon className="h-4 w-4 text-[var(--muted)]" />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-[var(--muted)]" />
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-[1.5rem] bg-[var(--background-soft)] p-4 text-sm text-[var(--muted)]">
            <p>Family: {family.parentContactName}</p>
            <p>Strategist: {family.strategistOwnerName}</p>
            <p>Ops: {family.opsOwnerName}</p>
            <p>Mode: {formatRoleLabel(actor.activeRole)}</p>
          </div>
        </div>

        <div className="space-y-6">
          <FlashBanner message={message} error={error} />

          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              label="Current SAT"
              value={student.testingProfile?.currentSat ? String(student.testingProfile.currentSat) : "—"}
              helper="Latest full attempt"
            />
            <MetricCard
              label="Projected SAT"
              value={student.testingProfile?.projectedSat ? String(student.testingProfile.projectedSat) : "—"}
              helper="Working target for list planning"
            />
            <MetricCard
              label="School list"
              value={`${student.schoolTargets.length}`}
              helper={`Reach ${reachCount} • Target ${targetCount} • Likely ${likelyCount}`}
            />
          </div>

          <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <SectionCard
              eyebrow="Overview"
              title="Narrative summary"
              description="The student is the center of gravity. This card holds current positioning rather than a generic CRM row."
              icon={Sparkles}
            >
              <div className="space-y-4 text-sm leading-7 text-[var(--muted)]">
                <div className="rounded-[1.5rem] bg-white/70 p-4">
                  <p className="font-semibold text-[var(--foreground)]">Current summary</p>
                  <p className="mt-2">
                    {latestSummary?.parentVisibleSummary ?? "No current monthly summary has been logged yet."}
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[1.5rem] border border-[var(--border)] bg-white/70 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Biggest win</p>
                    <p className="mt-3">{latestSummary?.biggestWin ?? "Not started yet."}</p>
                  </div>
                  <div className="rounded-[1.5rem] border border-[var(--border)] bg-white/70 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Biggest risk</p>
                    <p className="mt-3">{latestSummary?.biggestRisk ?? student.statusReason}</p>
                  </div>
                </div>
              </div>
              <details className="mt-5 rounded-[1.5rem] bg-[var(--background-soft)] p-4">
                <summary className="cursor-pointer font-semibold">Update current summary</summary>
                <form action={saveMonthlySummaryAction} className="mt-4 space-y-4">
                  <input type="hidden" name="familyId" value={family.id} />
                  <input type="hidden" name="familySlug" value={family.slug} />
                  <input type="hidden" name="studentId" value={student.id} />
                  <input type="hidden" name="studentSlug" value={student.slug} />
                  <input type="hidden" name="returnPath" value={returnPath} />
                  <input type="hidden" name="summaryId" value={latestSummary?.id ?? ""} />
                  <input
                    type="date"
                    name="reportingMonth"
                    defaultValue={latestSummary?.reportingMonth ?? student.lastUpdatedDate}
                    className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <textarea
                      name="biggestWin"
                      defaultValue={latestSummary?.biggestWin ?? ""}
                      rows={4}
                      placeholder="Biggest win"
                      className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
                    />
                    <textarea
                      name="biggestRisk"
                      defaultValue={latestSummary?.biggestRisk ?? ""}
                      rows={4}
                      placeholder="Biggest risk"
                      className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    {[1, 2, 3].map((index) => (
                      <input
                        key={index}
                        name={`topNextAction${index}`}
                        defaultValue={latestSummary?.topNextActions[index - 1] ?? ""}
                        placeholder={`Top next action ${index}`}
                        className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
                      />
                    ))}
                  </div>
                  <textarea
                    name="parentVisibleSummary"
                    defaultValue={latestSummary?.parentVisibleSummary ?? ""}
                    rows={3}
                    placeholder="Parent-visible summary"
                    className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
                  />
                  <textarea
                    name="internalSummaryNotes"
                    defaultValue={latestSummary?.internalSummaryNotes ?? ""}
                    rows={3}
                    placeholder="Internal summary notes"
                    className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!isSupabaseConfigured()}
                    className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Save summary
                  </button>
                </form>
              </details>
            </SectionCard>

            <SectionCard
              eyebrow="Testing + list"
              title="School fit workbench"
              description="Projected testing and bucket mix stay visible alongside the school list."
              icon={School}
            >
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[1.5rem] border border-[var(--border)] bg-white/70 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Current SAT</p>
                    <p className="section-title mt-3 text-3xl font-semibold">
                      {student.testingProfile?.currentSat ?? "—"}
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] border border-[var(--border)] bg-white/70 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Projected SAT</p>
                    <p className="section-title mt-3 text-3xl font-semibold">
                      {student.testingProfile?.projectedSat ?? "—"}
                    </p>
                  </div>
                </div>
                <div className="rounded-[1.5rem] bg-white/70 p-4 text-sm leading-7 text-[var(--muted)]">
                  {getSchoolFitRecommendation(
                    student.testingProfile?.currentSat,
                    student.testingProfile?.projectedSat,
                    targetCount,
                    likelyCount,
                  )}
                </div>
              </div>
              <details className="mt-5 rounded-[1.5rem] bg-[var(--background-soft)] p-4">
                <summary className="cursor-pointer font-semibold">Update testing profile</summary>
                <form action={saveTestingProfileAction} className="mt-4 grid gap-4 md:grid-cols-2">
                  <input type="hidden" name="familyId" value={family.id} />
                  <input type="hidden" name="familySlug" value={family.slug} />
                  <input type="hidden" name="studentId" value={student.id} />
                  <input type="hidden" name="studentSlug" value={student.slug} />
                  <input type="hidden" name="returnPath" value={returnPath} />
                  <input
                    type="number"
                    min="0"
                    name="currentSat"
                    defaultValue={student.testingProfile?.currentSat ?? ""}
                    placeholder="Current SAT"
                    className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
                  />
                  <input
                    type="number"
                    min="0"
                    name="projectedSat"
                    defaultValue={student.testingProfile?.projectedSat ?? ""}
                    placeholder="Projected SAT"
                    className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
                  />
                  <input
                    type="number"
                    min="0"
                    name="currentAct"
                    defaultValue={student.testingProfile?.currentAct ?? ""}
                    placeholder="Current ACT"
                    className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
                  />
                  <input
                    type="number"
                    min="0"
                    name="projectedAct"
                    defaultValue={student.testingProfile?.projectedAct ?? ""}
                    placeholder="Projected ACT"
                    className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
                  />
                  <textarea
                    name="strategyNote"
                    defaultValue={student.testingProfile?.strategyNote ?? ""}
                    rows={3}
                    placeholder="Testing strategy note"
                    className="md:col-span-2 w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!isSupabaseConfigured()}
                    className="md:col-span-2 rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Save testing profile
                  </button>
                </form>
              </details>
            </SectionCard>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <SectionCard
              eyebrow="Academic"
              title="Academic and tutoring"
              description="Latest subject priorities and test-prep status."
              icon={BookMarked}
            >
              {academicUpdate ? (
                <div className="space-y-3 rounded-[1.5rem] bg-white/70 p-4 text-sm leading-7 text-[var(--muted)]">
                  <p><strong className="text-[var(--foreground)]">Priority:</strong> {academicUpdate.subjectPriority}</p>
                  <p><strong className="text-[var(--foreground)]">Trend:</strong> {academicUpdate.gradeOrPredictedTrend}</p>
                  <p><strong className="text-[var(--foreground)]">Tutoring:</strong> {academicUpdate.tutoringStatus}</p>
                  <p>{academicUpdate.tutorNoteSummary}</p>
                </div>
              ) : (
                <div className="rounded-[1.5rem] bg-white/70 p-4 text-sm text-[var(--muted)]">No academic update yet.</div>
              )}
              <details className="mt-5 rounded-[1.5rem] bg-[var(--background-soft)] p-4">
                <summary className="cursor-pointer font-semibold">Update academics</summary>
                <form action={saveAcademicUpdateAction} className="mt-4 space-y-4">
                  <input type="hidden" name="familyId" value={family.id} />
                  <input type="hidden" name="familySlug" value={family.slug} />
                  <input type="hidden" name="studentId" value={student.id} />
                  <input type="hidden" name="studentSlug" value={student.slug} />
                  <input type="hidden" name="returnPath" value={returnPath} />
                  <input type="hidden" name="academicUpdateId" value={academicUpdate?.id ?? ""} />
                  <input type="date" name="date" defaultValue={academicUpdate?.date ?? student.lastUpdatedDate} className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none" />
                  <input name="subjectPriority" defaultValue={academicUpdate?.subjectPriority ?? ""} placeholder="Subject priority" className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none" />
                  <input name="gradeOrPredictedTrend" defaultValue={academicUpdate?.gradeOrPredictedTrend ?? ""} placeholder="Grade or predicted trend" className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none" />
                  <input name="tutoringStatus" defaultValue={academicUpdate?.tutoringStatus ?? ""} placeholder="Tutoring status" className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none" />
                  <textarea name="tutorNoteSummary" defaultValue={academicUpdate?.tutorNoteSummary ?? ""} rows={3} placeholder="Tutor note summary" className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none" />
                  <input name="testPrepStatus" defaultValue={academicUpdate?.testPrepStatus ?? ""} placeholder="Test prep status" className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none" />
                  <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <input type="checkbox" name="parentVisible" defaultChecked={academicUpdate?.parentVisible ?? true} />
                    Parent visible
                  </label>
                  <button type="submit" disabled={!isSupabaseConfigured()} className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">Save academic update</button>
                </form>
              </details>
            </SectionCard>

            <SectionCard
              eyebrow="Profile"
              title="Profile and project progress"
              description="Project lane, evidence, and mentor-facing posture."
              icon={Sparkles}
            >
              {profileUpdate ? (
                <div className="space-y-3 rounded-[1.5rem] bg-white/70 p-4 text-sm leading-7 text-[var(--muted)]">
                  <p><strong className="text-[var(--foreground)]">Project:</strong> {profileUpdate.projectName}</p>
                  <p><strong className="text-[var(--foreground)]">Milestone:</strong> {profileUpdate.milestoneStatus}</p>
                  <p><strong className="text-[var(--foreground)]">Evidence:</strong> {profileUpdate.evidenceAdded}</p>
                  <p>{profileUpdate.mentorNoteSummary}</p>
                </div>
              ) : (
                <div className="rounded-[1.5rem] bg-white/70 p-4 text-sm text-[var(--muted)]">No profile update yet.</div>
              )}
              <details className="mt-5 rounded-[1.5rem] bg-[var(--background-soft)] p-4">
                <summary className="cursor-pointer font-semibold">Update profile progress</summary>
                <form action={saveProfileUpdateAction} className="mt-4 space-y-4">
                  <input type="hidden" name="familyId" value={family.id} />
                  <input type="hidden" name="familySlug" value={family.slug} />
                  <input type="hidden" name="studentId" value={student.id} />
                  <input type="hidden" name="studentSlug" value={student.slug} />
                  <input type="hidden" name="returnPath" value={returnPath} />
                  <input type="hidden" name="profileUpdateId" value={profileUpdate?.id ?? ""} />
                  <input type="date" name="date" defaultValue={profileUpdate?.date ?? student.lastUpdatedDate} className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none" />
                  <input name="projectName" defaultValue={profileUpdate?.projectName ?? ""} placeholder="Project name" className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none" />
                  <input name="milestoneStatus" defaultValue={profileUpdate?.milestoneStatus ?? ""} placeholder="Milestone status" className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none" />
                  <input name="evidenceAdded" defaultValue={profileUpdate?.evidenceAdded ?? ""} placeholder="Evidence added" className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none" />
                  <textarea name="mentorNoteSummary" defaultValue={profileUpdate?.mentorNoteSummary ?? ""} rows={3} placeholder="Mentor note summary" className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none" />
                  <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <input type="checkbox" name="parentVisible" defaultChecked={profileUpdate?.parentVisible ?? true} />
                    Parent visible
                  </label>
                  <button type="submit" disabled={!isSupabaseConfigured()} className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">Save profile update</button>
                </form>
              </details>
            </SectionCard>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <SectionCard eyebrow="Activities" title="Activities and leadership" icon={Activity}>
              <div className="space-y-3">
                {student.activities.map((activity) => (
                  <div key={activity.id} className="rounded-[1.5rem] bg-white/70 p-4">
                    <p className="font-semibold">{activity.activityName}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{activity.role}</p>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{activity.impactSummary}</p>
                  </div>
                ))}
              </div>
              <details className="mt-5 rounded-[1.5rem] bg-[var(--background-soft)] p-4">
                <summary className="cursor-pointer font-semibold">Add activity</summary>
                <form action={saveStudentActivityAction} className="mt-4 space-y-4">
                  <input type="hidden" name="familyId" value={family.id} />
                  <input type="hidden" name="familySlug" value={family.slug} />
                  <input type="hidden" name="studentId" value={student.id} />
                  <input type="hidden" name="studentSlug" value={student.slug} />
                  <input type="hidden" name="returnPath" value={returnPath} />
                  <input name="activityName" placeholder="Activity name" className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none" />
                  <input name="role" placeholder="Role" className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none" />
                  <textarea name="impactSummary" rows={3} placeholder="Impact summary" className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none" />
                  <button type="submit" disabled={!isSupabaseConfigured()} className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">Save activity</button>
                </form>
              </details>
            </SectionCard>

            <SectionCard eyebrow="Competitions" title="Competitions and awards" icon={Trophy}>
              <div className="space-y-3">
                {student.competitions.map((item) => (
                  <div key={item.id} className="rounded-[1.5rem] bg-white/70 p-4">
                    <p className="font-semibold">{item.competitionName}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{item.result}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{item.yearLabel}</p>
                  </div>
                ))}
              </div>
              <details className="mt-5 rounded-[1.5rem] bg-[var(--background-soft)] p-4">
                <summary className="cursor-pointer font-semibold">Add competition</summary>
                <form action={saveStudentCompetitionAction} className="mt-4 space-y-4">
                  <input type="hidden" name="familyId" value={family.id} />
                  <input type="hidden" name="familySlug" value={family.slug} />
                  <input type="hidden" name="studentId" value={student.id} />
                  <input type="hidden" name="studentSlug" value={student.slug} />
                  <input type="hidden" name="returnPath" value={returnPath} />
                  <input name="competitionName" placeholder="Competition name" className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none" />
                  <input name="result" placeholder="Result" className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none" />
                  <input name="yearLabel" placeholder="Year" className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none" />
                  <button type="submit" disabled={!isSupabaseConfigured()} className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">Save competition</button>
                </form>
              </details>
            </SectionCard>

            <SectionCard eyebrow="School list" title="School targets" icon={School}>
              <div className="space-y-3">
                {student.schoolTargets.map((school) => (
                  <div key={school.id} className="rounded-[1.5rem] bg-white/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">{school.schoolName}</p>
                      <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                        {school.bucket}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[var(--muted)]">{school.country}</p>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{school.fitNote}</p>
                  </div>
                ))}
              </div>
              <details className="mt-5 rounded-[1.5rem] bg-[var(--background-soft)] p-4">
                <summary className="cursor-pointer font-semibold">Add school target</summary>
                <form action={saveStudentSchoolTargetAction} className="mt-4 space-y-4">
                  <input type="hidden" name="familyId" value={family.id} />
                  <input type="hidden" name="familySlug" value={family.slug} />
                  <input type="hidden" name="studentId" value={student.id} />
                  <input type="hidden" name="studentSlug" value={student.slug} />
                  <input type="hidden" name="returnPath" value={returnPath} />
                  <input name="schoolName" placeholder="School name" className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none" />
                  <div className="grid gap-4 md:grid-cols-2">
                    <input name="country" placeholder="Country" className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none" />
                    <select name="bucket" defaultValue="target" className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none">
                      <option value="reach">Reach</option>
                      <option value="target">Target</option>
                      <option value="likely">Likely</option>
                    </select>
                  </div>
                  <textarea name="fitNote" rows={3} placeholder="Fit note" className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none" />
                  <button type="submit" disabled={!isSupabaseConfigured()} className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">Save school target</button>
                </form>
              </details>
            </SectionCard>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <SectionCard eyebrow="Execution" title="Tasks and deadlines" description="Student-scoped tasks remain visible here, while family-wide decisions stay on the household workspace." icon={CalendarClock}>
              <div className="space-y-3">
                {student.tasks.map((task) => (
                  <div key={task.id} className="rounded-[1.5rem] border border-[var(--border)] bg-white/70 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="font-semibold">{task.itemName}</p>
                        <p className="mt-1 text-sm text-[var(--muted)]">{task.category} • {task.owner}</p>
                        {task.dependencyNotes ? (
                          <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{task.dependencyNotes}</p>
                        ) : null}
                      </div>
                      <div className="space-y-2 text-sm text-[var(--muted)] md:text-right">
                        <StatusBadge status={computeTaskStatus(task)} kind="task" />
                        <p>{formatDisplayDate(task.dueDate)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <details className="mt-5 rounded-[1.5rem] bg-[var(--background-soft)] p-4">
                <summary className="cursor-pointer font-semibold">Add student task</summary>
                <form action={saveTaskAction} className="mt-4 grid gap-4 md:grid-cols-2">
                  <input type="hidden" name="familyId" value={family.id} />
                  <input type="hidden" name="familySlug" value={family.slug} />
                  <input type="hidden" name="studentId" value={student.id} />
                  <input type="hidden" name="studentSlug" value={student.slug} />
                  <input type="hidden" name="returnPath" value={returnPath} />
                  <input name="itemName" placeholder="Task name" className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none" />
                  <select name="category" defaultValue="application" className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none">
                    <option value="application">Application</option>
                    <option value="testing">Testing</option>
                    <option value="academics">Academics</option>
                    <option value="project">Project</option>
                    <option value="admin">Admin</option>
                  </select>
                  <input name="owner" placeholder="Owner" className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none" />
                  <input type="date" name="dueDate" defaultValue={student.lastUpdatedDate} className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none" />
                  <select name="status" defaultValue="not_started" className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none">
                    <option value="not_started">Not started</option>
                    <option value="in_progress">In progress</option>
                    <option value="blocked">Blocked</option>
                    <option value="done">Done</option>
                    <option value="overdue">Overdue</option>
                  </select>
                  <input name="dependencyNotes" placeholder="Dependency notes" className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none" />
                  <label className="md:col-span-2 flex items-center gap-2 text-sm text-[var(--muted)]">
                    <input type="checkbox" name="parentVisible" />
                    Parent visible
                  </label>
                  <button type="submit" disabled={!isSupabaseConfigured()} className="md:col-span-2 rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">Save task</button>
                </form>
              </details>
            </SectionCard>

            <div className="space-y-6">
              <SectionCard eyebrow="Decisions" title="Student decisions" icon={MessageSquare}>
                <div className="space-y-3">
                  {student.decisionLogItems.map((decision) => (
                    <div key={decision.id} className="rounded-[1.5rem] bg-white/70 p-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="font-semibold">{decision.decisionType}</p>
                        {decision.pendingFamilyInput ? <StatusBadge status="yellow" /> : null}
                      </div>
                      <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{decision.summary}</p>
                    </div>
                  ))}
                </div>
                <details className="mt-5 rounded-[1.5rem] bg-[var(--background-soft)] p-4">
                  <summary className="cursor-pointer font-semibold">Add student decision</summary>
                  <form action={saveDecisionAction} className="mt-4 space-y-4">
                    <input type="hidden" name="familyId" value={family.id} />
                    <input type="hidden" name="familySlug" value={family.slug} />
                    <input type="hidden" name="studentId" value={student.id} />
                    <input type="hidden" name="studentSlug" value={student.slug} />
                    <input type="hidden" name="returnPath" value={returnPath} />
                    <div className="grid gap-4 md:grid-cols-2">
                      <input type="date" name="date" defaultValue={student.lastUpdatedDate} className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none" />
                      <input name="decisionType" placeholder="Decision type" className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none" />
                    </div>
                    <textarea name="summary" rows={3} placeholder="Decision summary" className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none" />
                    <div className="grid gap-4 md:grid-cols-2">
                      <input name="owner" placeholder="Owner" className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none" />
                      <select name="status" defaultValue="pending" className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none">
                        <option value="pending">Pending</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-[var(--muted)]"><input type="checkbox" name="pendingFamilyInput" /> Pending family input</label>
                    <label className="flex items-center gap-2 text-sm text-[var(--muted)]"><input type="checkbox" name="parentVisible" defaultChecked /> Parent visible</label>
                    <button type="submit" disabled={!isSupabaseConfigured()} className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">Save decision</button>
                  </form>
                </details>
              </SectionCard>

              <SectionCard eyebrow="Archive" title="Prior summaries" icon={Sparkles}>
                <div className="space-y-3">
                  {summaryHistory.length === 0 ? (
                    <div className="rounded-[1.5rem] bg-white/70 p-4 text-sm text-[var(--muted)]">No prior summaries yet.</div>
                  ) : (
                    summaryHistory.map((summary) => (
                      <div key={summary.id} className="rounded-[1.5rem] bg-white/70 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{formatDisplayDate(summary.reportingMonth)}</p>
                        <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{summary.biggestWin}</p>
                      </div>
                    ))
                  )}
                </div>
              </SectionCard>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
            <SectionCard eyebrow="Notes" title="Student notes" icon={MessageSquare}>
              <div className="space-y-3">
                {student.notes.map((note) => (
                  <div key={note.id} className="rounded-[1.5rem] border border-[var(--border)] bg-white/70 p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-semibold">{note.summary}</p>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                        {note.visibility}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{note.body}</p>
                  </div>
                ))}
              </div>
              <details className="mt-5 rounded-[1.5rem] bg-[var(--background-soft)] p-4">
                <summary className="cursor-pointer font-semibold">Add student note</summary>
                <form action={saveNoteAction} className="mt-4 space-y-4">
                  <input type="hidden" name="familyId" value={family.id} />
                  <input type="hidden" name="familySlug" value={family.slug} />
                  <input type="hidden" name="studentId" value={student.id} />
                  <input type="hidden" name="studentSlug" value={student.slug} />
                  <input type="hidden" name="returnPath" value={returnPath} />
                  <div className="grid gap-4 md:grid-cols-2">
                    <input type="date" name="date" defaultValue={student.lastUpdatedDate} className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none" />
                    <select name="authorRole" defaultValue="strategist" className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none">
                      <option value="strategist">Strategist</option>
                      <option value="ops">Ops</option>
                      <option value="tutor_input">Tutor input</option>
                      <option value="mentor_input">Mentor input</option>
                    </select>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <input name="noteType" placeholder="Note type" className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none" />
                    <select name="visibility" defaultValue="internal" className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none">
                      <option value="internal">Internal</option>
                      <option value="parent">Parent</option>
                    </select>
                  </div>
                  <input name="summary" placeholder="Note summary" className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none" />
                  <textarea name="body" rows={4} placeholder="Detailed note" className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none" />
                  <button type="submit" disabled={!isSupabaseConfigured()} className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">Save note</button>
                </form>
              </details>
            </SectionCard>

            <SectionCard eyebrow="Artifacts" title="Student artifacts" icon={Files}>
              <div className="space-y-3">
                {[...student.artifactLinks, ...familyWideArtifacts].map((artifact) => (
                  <a key={artifact.id} href={artifact.linkUrl} target="_blank" rel="noreferrer" className="block rounded-[1.5rem] border border-[var(--border)] bg-white/70 p-4 transition hover:bg-white">
                    <p className="font-semibold">{artifact.artifactName}</p>
                    <p className="mt-2 text-sm text-[var(--muted)]">{artifact.artifactType.replace("_", " ")} • {artifact.owner}</p>
                  </a>
                ))}
              </div>
              <details className="mt-5 rounded-[1.5rem] bg-[var(--background-soft)] p-4">
                <summary className="cursor-pointer font-semibold">Add student artifact</summary>
                <form action={saveArtifactLinkAction} className="mt-4 space-y-4">
                  <input type="hidden" name="familyId" value={family.id} />
                  <input type="hidden" name="familySlug" value={family.slug} />
                  <input type="hidden" name="studentId" value={student.id} />
                  <input type="hidden" name="studentSlug" value={student.slug} />
                  <input type="hidden" name="returnPath" value={returnPath} />
                  <div className="grid gap-4 md:grid-cols-2">
                    <input name="artifactName" placeholder="Artifact name" className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none" />
                    <select name="artifactType" defaultValue="drive_folder" className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none">
                      <option value="drive_folder">Drive folder</option>
                      <option value="doc">Doc</option>
                      <option value="sheet">Sheet</option>
                      <option value="slide">Slide</option>
                      <option value="external_link">External link</option>
                    </select>
                  </div>
                  <input name="linkUrl" placeholder="https://..." className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none" />
                  <div className="grid gap-4 md:grid-cols-2">
                    <input type="date" name="uploadDate" defaultValue={student.lastUpdatedDate} className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none" />
                    <input name="owner" placeholder="Owner" className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none" />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-[var(--muted)]"><input type="checkbox" name="parentVisible" /> Parent visible</label>
                  <button type="submit" disabled={!isSupabaseConfigured()} className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">Save artifact</button>
                </form>
              </details>
            </SectionCard>
          </section>

          {(familyWideNotes.length > 0 || familyWideDecisions.length > 0) ? (
            <SectionCard
              eyebrow="Family context"
              title="Shared household context"
              description="Family-wide coordination stays visible here so student strategy work does not lose household-level context."
              icon={MessageSquare}
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  {familyWideDecisions.slice(0, 3).map((decision) => (
                    <div key={decision.id} className="rounded-[1.5rem] bg-white/70 p-4">
                      <p className="font-semibold">{decision.decisionType}</p>
                      <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{decision.summary}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  {familyWideNotes.slice(0, 3).map((note) => (
                    <div key={note.id} className="rounded-[1.5rem] bg-white/70 p-4">
                      <p className="font-semibold">{note.summary}</p>
                      <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{note.body}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-5">
                <Link
                  href={`/families/${family.slug}`}
                  className="inline-flex rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold"
                >
                  Open family workspace
                </Link>
              </div>
            </SectionCard>
          ) : null}
        </div>
      </section>
    </div>
  );
}
