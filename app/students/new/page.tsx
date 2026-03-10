import Link from "next/link";
import { FlashBanner } from "@/components/shared/flash-banner";
import { SectionCard } from "@/components/shared/section-card";
import { createStudentAction } from "@/app/families/actions";
import { isSupabaseConfigured } from "@/lib/auth/config";
import { formatRoleLabel } from "@/lib/auth/roles";
import { requireInternalAccess } from "@/lib/auth/session";
import { getInternalFamilyBySlug, listInternalFamilies } from "@/lib/db/queries";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getStringValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewStudentPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const actor = await requireInternalAccess("/students/new");
  const resolved = await searchParams;
  const familySlug = getStringValue(resolved.family);
  const message = getStringValue(resolved.message);
  const error = getStringValue(resolved.error);

  if (!familySlug) {
    const families = await listInternalFamilies(actor);

    return (
      <div className="space-y-8">
        <section className="panel rounded-[2rem] px-6 py-8 md:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
            Add student
          </p>
          <h1 className="section-title mt-3 text-4xl font-semibold">Choose a family first</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--muted)]">
            Current mode: {formatRoleLabel(actor.activeRole)}. Student creation attaches the new student to an existing family workspace.
          </p>
        </section>
        <div className="grid gap-4 md:grid-cols-2">
          {families.map((family) => (
            <Link
              key={family.slug}
              href={`/students/new?family=${family.slug}`}
              className="panel rounded-[2rem] p-6 transition hover:translate-y-[-1px]"
            >
              <h2 className="section-title text-2xl font-semibold">{family.familyLabel}</h2>
              <p className="mt-3 text-sm text-[var(--muted)]">
                {family.parentContactName} • {family.studentCount} students
              </p>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const family = await getInternalFamilyBySlug(actor, familySlug);
  if (!family) {
    return (
      <div className="panel rounded-[2rem] p-8 text-sm leading-7 text-[var(--muted)]">
        Family access is not available in the current role.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <section className="panel rounded-[2rem] px-6 py-8 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
              Add student
            </p>
            <h1 className="section-title mt-3 text-4xl font-semibold">{family.familyLabel}</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--muted)]">
              Create an additional student inside this family workspace.
            </p>
          </div>
          <Link
            href={`/families/${family.slug}`}
            className="rounded-full border border-[var(--border)] bg-white/70 px-4 py-2 text-sm font-semibold"
          >
            Back to family
          </Link>
        </div>
      </section>

      <FlashBanner message={message} error={error} />

      <SectionCard
        eyebrow="Student"
        title="New student profile"
        description="Start with core posture and testing baseline; deeper portfolio modules can be added after creation."
      >
        <form action={createStudentAction} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="familyId" value={family.id} />
          <input type="hidden" name="familySlug" value={family.slug} />
          <input type="hidden" name="returnPath" value={`/students/new?family=${family.slug}`} />
          <label className="space-y-2 text-sm">
            <span className="font-semibold text-[var(--muted)]">Student name</span>
            <input
              name="studentName"
              required
              className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-semibold text-[var(--muted)]">Grade level</span>
            <input
              name="gradeLevel"
              defaultValue="Grade 11"
              required
              className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-semibold text-[var(--muted)]">Pathway</span>
            <select
              name="pathway"
              defaultValue="us_college"
              className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
            >
              <option value="us_college">US College</option>
              <option value="uk_college">UK College</option>
              <option value="us_boarding">US Boarding</option>
              <option value="uk_boarding">UK Boarding</option>
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-semibold text-[var(--muted)]">Tier</span>
            <input
              name="tier"
              defaultValue="Core Pathway"
              required
              className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-semibold text-[var(--muted)]">Current phase</span>
            <input
              name="currentPhase"
              defaultValue="Launch and roadmap"
              required
              className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-semibold text-[var(--muted)]">Overall status</span>
            <select
              name="overallStatus"
              defaultValue="green"
              className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
            >
              <option value="green">Green</option>
              <option value="yellow">Yellow</option>
              <option value="red">Red</option>
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-semibold text-[var(--muted)]">Current SAT</span>
            <input
              type="number"
              min="0"
              name="currentSat"
              className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-semibold text-[var(--muted)]">Projected SAT</span>
            <input
              type="number"
              min="0"
              name="projectedSat"
              className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-semibold text-[var(--muted)]">Current ACT</span>
            <input
              type="number"
              min="0"
              name="currentAct"
              className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-semibold text-[var(--muted)]">Projected ACT</span>
            <input
              type="number"
              min="0"
              name="projectedAct"
              className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
            />
          </label>
          <label className="space-y-2 text-sm md:col-span-2">
            <span className="font-semibold text-[var(--muted)]">Status reason</span>
            <textarea
              name="statusReason"
              rows={4}
              required
              className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
            />
          </label>
          <label className="space-y-2 text-sm md:col-span-2">
            <span className="font-semibold text-[var(--muted)]">Testing strategy note</span>
            <textarea
              name="strategyNote"
              rows={3}
              className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
            />
          </label>
          <div className="md:col-span-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={!isSupabaseConfigured()}
              className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              Create student
            </button>
            {!isSupabaseConfigured() ? (
              <p className="text-sm text-[var(--muted)]">
                Live Supabase credentials are required to write real records.
              </p>
            ) : null}
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
