import Link from "next/link";
import { LockKeyhole, NotebookPen, Orbit, Sparkles } from "lucide-react";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { getPortalAccess } from "@/lib/auth/session";
import { getParentPortalSnapshot } from "@/lib/db/queries";
import { formatDisplayDate } from "@/lib/domain/dashboard";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getStringValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PortalPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolved = await searchParams;
  const familySlug = getStringValue(resolved.family);
  const access = await getPortalAccess("/portal");
  const portal = await getParentPortalSnapshot(access, familySlug);

  if (access.mode === "live" && !access.enabled) {
    return (
      <div className="space-y-8">
        <section className="panel rounded-[2rem] px-6 py-8 md:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
            Parent portal
          </p>
          <h1 className="section-title mt-3 text-4xl font-semibold">
            Parent access is not part of the internal pilot yet
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--muted)]">
            Live mode disables the demo family switcher and does not expose the parent view to internal accounts.
          </p>
        </section>
      </div>
    );
  }

  if (!portal) {
    return (
      <div className="panel rounded-[2rem] p-8 text-sm leading-7 text-[var(--muted)]">
        Parent access has not been activated yet.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="panel rounded-[2rem] px-6 py-8 md:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
              Parent portal
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="section-title text-4xl font-semibold">{portal.family.familyLabel}</h1>
              <StatusBadge status={portal.family.overallStatus} />
            </div>
            <p className="text-base leading-8 text-[var(--muted)]">
              A calmer monthly view for {portal.family.parentContactName}, grouped by student and limited to parent-safe information only.
            </p>
          </div>
          <div className="rounded-[1.75rem] bg-white/70 p-5 text-sm text-[var(--muted)]">
            <p>{portal.students.length} students in this workspace</p>
          </div>
        </div>
      </section>

      <div className="space-y-6">
        {portal.students.map((student) => (
          <SectionCard
            key={student.id}
            eyebrow={student.gradeLevel}
            title={student.studentName}
            description={`${student.pathway.replace("_", " ")} • ${student.currentPhase}`}
            icon={LockKeyhole}
          >
            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[1.75rem] bg-white/70 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Executive summary</p>
                <p className="mt-3 text-sm leading-8 text-[var(--muted)]">
                  {student.currentSummary?.parentVisibleSummary ?? "No student summary is available yet."}
                </p>
              </div>
              <div className="rounded-[1.75rem] bg-white/70 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Top next actions</p>
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-7 text-[var(--muted)]">
                  {(student.currentSummary?.topNextActions ?? []).map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <SectionCard
                eyebrow="Academics"
                title="Latest academic snapshot"
                description="Only parent-visible tutoring and academic updates appear here."
                icon={NotebookPen}
              >
                {student.academicUpdate ? (
                  <div className="space-y-3 text-sm leading-7 text-[var(--muted)]">
                    <p><strong className="text-[var(--foreground)]">Priority:</strong> {student.academicUpdate.subjectPriority}</p>
                    <p><strong className="text-[var(--foreground)]">Trend:</strong> {student.academicUpdate.gradeOrPredictedTrend}</p>
                    <p><strong className="text-[var(--foreground)]">Tutoring status:</strong> {student.academicUpdate.tutoringStatus}</p>
                    <p>{student.academicUpdate.tutorNoteSummary}</p>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--muted)]">No academic update available yet.</p>
                )}
              </SectionCard>

              <SectionCard
                eyebrow="Profile"
                title="Project and profile progress"
                description="Latest parent-visible profile signal."
                icon={Sparkles}
              >
                {student.profileUpdate ? (
                  <div className="space-y-3 text-sm leading-7 text-[var(--muted)]">
                    <p><strong className="text-[var(--foreground)]">Current project:</strong> {student.profileUpdate.projectName}</p>
                    <p><strong className="text-[var(--foreground)]">Milestone:</strong> {student.profileUpdate.milestoneStatus}</p>
                    <p>{student.profileUpdate.mentorNoteSummary}</p>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--muted)]">No profile update available yet.</p>
                )}
              </SectionCard>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <SectionCard
                eyebrow="Deadlines"
                title="Upcoming visible work"
                description="Only student tasks marked parent-visible are shown."
                icon={Orbit}
              >
                <div className="space-y-3">
                  {student.tasks.length === 0 ? (
                    <p className="text-sm text-[var(--muted)]">No visible tasks right now.</p>
                  ) : (
                    student.tasks.map((task) => (
                      <div key={task.id} className="rounded-[1.75rem] bg-white/70 p-5">
                        <p className="font-semibold">{task.itemName}</p>
                        <p className="mt-2 text-sm leading-7 text-[var(--muted)]">Owner: {task.owner}</p>
                        <p className="text-sm text-[var(--muted)]">Due {formatDisplayDate(task.dueDate)}</p>
                      </div>
                    ))
                  )}
                </div>
              </SectionCard>

              <SectionCard
                eyebrow="Family input"
                title="Open decisions"
                description="Items awaiting household confirmation remain visible until resolved."
                icon={LockKeyhole}
              >
                <div className="space-y-3">
                  {student.decisions.length === 0 ? (
                    <p className="text-sm text-[var(--muted)]">No open student decisions right now.</p>
                  ) : (
                    student.decisions.map((decision) => (
                      <div key={decision.id} className="rounded-[1.75rem] bg-white/70 p-5">
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="font-semibold">{decision.decisionType}</p>
                          {decision.pendingFamilyInput ? (
                            <span className="rounded-full bg-[var(--warn-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--warn)]">
                              Family input needed
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{decision.summary}</p>
                      </div>
                    ))
                  )}
                </div>
              </SectionCard>
            </div>

            <SectionCard
              eyebrow="Resources"
              title="Selected links"
              description="Google Drive remains the source of truth for shared artifacts."
              icon={NotebookPen}
            >
              <div className="grid gap-4 md:grid-cols-2">
                {student.artifactLinks.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">No visible links yet.</p>
                ) : (
                  student.artifactLinks.map((artifact) => (
                    <a
                      key={artifact.id}
                      href={artifact.linkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-[1.75rem] border border-[var(--border)] bg-white/70 p-5 transition hover:bg-white"
                    >
                      <p className="font-semibold">{artifact.artifactName}</p>
                      <p className="mt-2 text-sm text-[var(--muted)]">
                        {artifact.artifactType.replace("_", " ")}
                      </p>
                    </a>
                  ))
                )}
              </div>
            </SectionCard>

            {student.summaryHistory.length > 0 ? (
              <SectionCard
                eyebrow="Archive"
                title="Prior monthly summaries"
                description="Monthly history stays visible instead of being overwritten."
                icon={Sparkles}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  {student.summaryHistory.map((summary) => (
                    <div key={summary.id} className="rounded-[1.75rem] bg-white/70 p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                        {formatDisplayDate(summary.reportingMonth)}
                      </p>
                      <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                        <strong className="text-[var(--foreground)]">Win:</strong> {summary.biggestWin}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                        <strong className="text-[var(--foreground)]">Risk:</strong> {summary.biggestRisk}
                      </p>
                    </div>
                  ))}
                </div>
              </SectionCard>
            ) : null}
          </SectionCard>
        ))}
      </div>

      {portal.familyDecisions.length > 0 || portal.familyArtifactLinks.length > 0 ? (
        <SectionCard
          eyebrow="Household"
          title="Shared family context"
          description="Family-wide resources and decisions remain visible below the student sections."
          icon={LockKeyhole}
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              {portal.familyDecisions.map((decision) => (
                <div key={decision.id} className="rounded-[1.75rem] bg-white/70 p-5">
                  <p className="font-semibold">{decision.decisionType}</p>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{decision.summary}</p>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              {portal.familyArtifactLinks.map((artifact) => (
                <a
                  key={artifact.id}
                  href={artifact.linkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-[1.75rem] border border-[var(--border)] bg-white/70 p-5 transition hover:bg-white"
                >
                  <p className="font-semibold">{artifact.artifactName}</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">{artifact.artifactType.replace("_", " ")}</p>
                </a>
              ))}
            </div>
          </div>
        </SectionCard>
      ) : null}

      {access.mode === "demo" ? (
        <div className="flex flex-wrap gap-3">
          {portal.availableSlugs.map((slug) => (
            <Link
              key={slug}
              href={`/portal?family=${slug}`}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                slug === portal.family.slug
                  ? "bg-[var(--accent)] text-white"
                  : "border border-[var(--border)] bg-white/70 text-[var(--foreground)]"
              }`}
            >
              Demo family: {slug}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
