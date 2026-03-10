import Link from "next/link";
import { ArrowUpRight, CircleAlert, Clock3, GraduationCap, WandSparkles } from "lucide-react";
import { MetricCard } from "@/components/shared/metric-card";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatRoleLabel } from "@/lib/auth/roles";
import { requireInternalAccess } from "@/lib/auth/session";
import { getInternalDashboardSnapshot } from "@/lib/db/queries";
import { formatDisplayDate } from "@/lib/domain/dashboard";

export default async function DashboardPage() {
  const actor = await requireInternalAccess("/dashboard");
  let snapshot: Awaited<ReturnType<typeof getInternalDashboardSnapshot>> | null = null;
  let loadError: string | null = null;

  try {
    snapshot = await getInternalDashboardSnapshot(actor);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Unable to load live dashboard data.";
  }

  if (!snapshot) {
    return (
      <div className="panel rounded-[2rem] p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
          Internal dashboard
        </p>
        <h1 className="section-title mt-3 text-3xl font-semibold">Live data is not available</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--muted)]">
          The app is in live mode, so it will not silently fall back to demo fixtures on protected internal pages.
          Resolve the Supabase query or policy issue and reload.
        </p>
        <p className="mt-4 rounded-[1.25rem] bg-[var(--warn-soft)] px-4 py-3 text-sm text-[var(--warn)]">
          {loadError ?? "Unable to load live dashboard data."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="panel rounded-[2rem] px-6 py-8 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
              Internal dashboard
            </p>
            <h1 className="section-title mt-3 text-4xl font-semibold">Student command center</h1>
            <p className="mt-4 text-base leading-8 text-[var(--muted)]">
              Signed in as {actor.fullName}. Assigned roles:{" "}
              {actor.roles.map((role) => formatRoleLabel(role)).join(" / ")}. Current mode:{" "}
              {formatRoleLabel(actor.activeRole)} with{" "}
              {actor.familyScope === "all" ? "global internal access" : "assigned family scope"}.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/families/new"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white"
            >
              New family
            </Link>
            <Link
              href="/students/new"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/70 px-5 py-3 text-sm font-semibold"
            >
              Add student
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Active students"
          value={String(snapshot.metrics.activeStudents)}
          helper={`Across ${snapshot.metrics.activeFamilies} families`}
        />
        <MetricCard
          label="Urgent students"
          value={String(snapshot.metrics.urgentStudents)}
          helper="Red posture or overdue work"
        />
        <MetricCard
          label="Overdue items"
          value={String(snapshot.metrics.overdueItems)}
          helper="Nearest unresolved work across all students"
        />
        <MetricCard
          label="Parent-visible due soon"
          value={String(snapshot.metrics.parentVisibleDueSoon)}
          helper="Visible deadlines inside the next 14 days"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard
          eyebrow="Priority queue"
          title="Students needing attention now"
          description="The queue ranks individual students first so strategists can triage work without opening each family."
          icon={CircleAlert}
        >
          <div className="space-y-4">
            {snapshot.urgentStudents.map((student) => (
              <article
                key={student.slug}
                className="rounded-[1.75rem] border border-[var(--border)] bg-white/70 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-semibold">{student.studentName}</h2>
                      <StatusBadge status={student.overallStatus} />
                      <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                        {student.gradeLevel}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                        {student.pathwayLabel}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--muted)]">
                      {student.familyLabel} • {student.currentPhase} • {student.tier}
                    </p>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-[1.25rem] bg-[var(--background-soft)] px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                          Testing
                        </p>
                        <p className="mt-2 font-semibold">
                          {student.currentSat ? `SAT ${student.currentSat}` : "No SAT yet"}
                          {student.projectedSat ? ` -> ${student.projectedSat}` : ""}
                        </p>
                      </div>
                      <div className="rounded-[1.25rem] bg-[var(--background-soft)] px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                          School mix
                        </p>
                        <p className="mt-2 font-semibold">
                          R {student.schoolBucketCounts.reach} / T {student.schoolBucketCounts.target} / L{" "}
                          {student.schoolBucketCounts.likely}
                        </p>
                      </div>
                      <div className="rounded-[1.25rem] bg-[var(--background-soft)] px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                          Next due
                        </p>
                        <p className="mt-2 font-semibold">
                          {student.nextCriticalDueDate
                            ? formatDisplayDate(student.nextCriticalDueDate)
                            : "No active due date"}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm leading-7 text-[var(--muted)]">{student.biggestRisk}</p>
                  </div>
                  <div className="min-w-[220px] space-y-3 rounded-[1.5rem] bg-[var(--background-soft)] p-4 text-sm text-[var(--muted)]">
                    <p>Pending decisions: {student.pendingDecisionCount}</p>
                    <p>Overdue tasks: {student.overdueTaskCount}</p>
                    <p>Updated: {formatDisplayDate(student.lastUpdatedDate)}</p>
                    <Link
                      href={`/students/${student.slug}`}
                      className="inline-flex items-center gap-2 font-semibold text-[var(--accent)]"
                    >
                      Open student portfolio
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                    <Link href={`/families/${student.familySlug}`} className="block font-semibold text-[var(--accent)]">
                      Open family workspace
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard
            eyebrow="Deadline map"
            title="Upcoming work"
            description="Nearest unresolved tasks across the whole student roster."
            icon={Clock3}
          >
            <div className="space-y-3">
              {snapshot.upcomingTasks.map((task) => (
                <div
                  key={`${task.familySlug}-${task.studentName}-${task.itemName}`}
                  className="rounded-[1.5rem] border border-[var(--border)] bg-white/70 px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{task.itemName}</p>
                      <p className="text-sm text-[var(--muted)]">
                        {task.studentName} • {task.familyLabel}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                        {task.parentVisible ? "Parent visible" : "Internal only"}
                      </p>
                    </div>
                    <div className="space-y-2 text-right">
                      <StatusBadge status={task.computedStatus} kind="task" />
                      <p className="text-sm text-[var(--muted)]">{formatDisplayDate(task.dueDate)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="School fit"
            title="Testing-to-list guidance"
            description="Deterministic rule suggestions based on current/projected SAT and the live school bucket mix."
            icon={WandSparkles}
          >
            <div className="space-y-3">
              {snapshot.schoolFitInsights.map((item) => (
                <div key={item.studentSlug} className="rounded-[1.5rem] bg-white/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.studentName}</p>
                      <p className="text-sm text-[var(--muted)]">
                        {item.currentSat ? `SAT ${item.currentSat}` : "No current SAT"}
                        {item.projectedSat ? ` -> ${item.projectedSat}` : ""}
                      </p>
                    </div>
                    <Link
                      href={`/students/${item.studentSlug}`}
                      className="inline-flex rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                    >
                      Review
                    </Link>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{item.recommendation}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Coverage"
            title="Portfolio readiness"
            description="Structured student data supports the new 360 workflow."
            icon={GraduationCap}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.5rem] bg-white/70 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Testing profiles</p>
                <p className="section-title mt-3 text-3xl font-semibold">
                  {snapshot.metrics.testingProfilesReady}
                </p>
              </div>
              <div className="rounded-[1.5rem] bg-white/70 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">School lists</p>
                <p className="section-title mt-3 text-3xl font-semibold">
                  {snapshot.metrics.schoolListsReady}
                </p>
              </div>
            </div>
          </SectionCard>
        </div>
      </section>
    </div>
  );
}
