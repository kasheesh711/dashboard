import Link from "next/link";
import { ArrowRight, BookOpen, Compass, LockKeyhole, Sparkles } from "lucide-react";
import { MetricCard } from "@/components/shared/metric-card";
import { SectionCard } from "@/components/shared/section-card";
import { getPreviewDashboardSnapshot, listPreviewFamilies } from "@/lib/db/queries";
import { getAppModeLabel } from "@/lib/auth/config";

export default async function Home() {
  const [snapshot, families] = await Promise.all([
    getPreviewDashboardSnapshot(),
    listPreviewFamilies({ deadlineWindow: "30" }),
  ]);

  return (
    <div className="space-y-10 fade-in">
      <section className="grain panel overflow-hidden rounded-[2rem] px-6 py-8 md:px-10 md:py-12">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-5">
            <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
              {getAppModeLabel()} workspace
            </span>
            <div className="space-y-4">
              <h1 className="section-title max-w-4xl text-4xl leading-tight font-semibold md:text-6xl">
                Run BeGifted as a student-first consulting cockpit.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-[var(--muted)] md:text-lg">
                The workspace now supports multi-student families, a student-first internal command center, and parent-safe reporting grouped by student.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:translate-y-[-1px]"
              >
                Open internal dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/portal"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-white/70 px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-white"
              >
                Preview parent portal
                <LockKeyhole className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="grid min-w-full gap-4 md:min-w-[340px] md:grid-cols-2 lg:w-[360px] lg:grid-cols-1">
            <MetricCard
              label="Pilot families"
              value={String(snapshot.metrics.activeFamilies)}
              helper="Seeded household workspaces"
            />
            <MetricCard
              label="Active students"
              value={String(snapshot.metrics.activeStudents)}
              helper="Student-first internal operating unit"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Urgent students"
          value={String(snapshot.metrics.urgentStudents)}
          helper="Red posture or overdue work"
        />
        <MetricCard
          label="Overdue items"
          value={String(snapshot.metrics.overdueItems)}
          helper="Tracked across all student portfolios"
        />
        <MetricCard
          label="Testing profiles"
          value={`${snapshot.metrics.testingProfilesReady}/${snapshot.metrics.activeStudents}`}
          helper="Students with structured testing data"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <SectionCard
          eyebrow="Workspace"
          title="What is implemented"
          description="The repo now centers internal execution on students while preserving household context and parent-safe visibility boundaries."
          icon={Sparkles}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-3xl bg-white/70 p-5">
              <p className="text-sm font-semibold text-[var(--foreground)]">Multi-student families</p>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                Families now act as household containers with one or more student workspaces.
              </p>
            </div>
            <div className="rounded-3xl bg-white/70 p-5">
              <p className="text-sm font-semibold text-[var(--foreground)]">Student 360 portfolios</p>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                Testing, activities, competitions, school targets, deadlines, and progress live on dedicated student pages.
              </p>
            </div>
            <div className="rounded-3xl bg-white/70 p-5">
              <p className="text-sm font-semibold text-[var(--foreground)]">Native create flows</p>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                Internal users can create a family with its first student and add more students natively.
              </p>
            </div>
            <div className="rounded-3xl bg-white/70 p-5">
              <p className="text-sm font-semibold text-[var(--foreground)]">Parent-safe grouping</p>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                The portal keeps parent-safe records separated by student while preserving family-wide context.
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Launch cohort"
          title="Pilot household watchlist"
          description="The seeded cohort includes a multi-student family so routing, aggregation, and portal grouping can be exercised immediately."
          icon={Compass}
        >
          <ul className="space-y-3">
            {families.slice(0, 4).map((family) => (
              <li
                key={family.slug}
                className="rounded-3xl border border-[var(--border)] bg-white/65 px-4 py-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{family.familyLabel}</p>
                    <p className="text-sm text-[var(--muted)]">
                      {family.studentCount} students • {family.strategistOwnerName}
                    </p>
                  </div>
                  <Link
                    href={`/families/${family.slug}`}
                    className="text-sm font-semibold text-[var(--accent)]"
                  >
                    Open
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-4">
        <SectionCard eyebrow="Route" title="Dashboard" description="Student-first triage and school-fit guidance." icon={Compass}>
          <Link href="/dashboard" className="text-sm font-semibold text-[var(--accent)]">
            Open /dashboard
          </Link>
        </SectionCard>
        <SectionCard eyebrow="Route" title="Families" description="Household roster with student counts and context." icon={Sparkles}>
          <Link href="/families" className="text-sm font-semibold text-[var(--accent)]">
            Open /families
          </Link>
        </SectionCard>
        <SectionCard eyebrow="Route" title="Students" description="Dedicated student 360 strategy workspace." icon={Compass}>
          <Link href="/students/new" className="text-sm font-semibold text-[var(--accent)]">
            Open /students/new
          </Link>
        </SectionCard>
        <SectionCard eyebrow="Docs" title="Documentation" description="Product spec and schema references for autonomous continuation." icon={BookOpen}>
          <p className="text-sm leading-7 text-[var(--muted)]">
            Start with <code>docs/PRD.md</code>, then <code>docs/data-model.md</code>.
          </p>
        </SectionCard>
      </section>
    </div>
  );
}
