import Link from "next/link";
import { FlashBanner } from "@/components/shared/flash-banner";
import { SectionCard } from "@/components/shared/section-card";
import { createFamilyWithStudentAction } from "@/app/families/actions";
import { formatRoleLabel } from "@/lib/auth/roles";
import { isSupabaseConfigured } from "@/lib/auth/config";
import { requireInternalAccess } from "@/lib/auth/session";
import { getInternalAssigneeOptions } from "@/lib/db/queries";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getStringValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewFamilyPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const actor = await requireInternalAccess("/families/new");
  const assignees = await getInternalAssigneeOptions(actor);
  const resolved = await searchParams;
  const message = getStringValue(resolved.message);
  const error = getStringValue(resolved.error);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="panel rounded-[2rem] px-6 py-8 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
              Family creation
            </p>
            <h1 className="section-title mt-3 text-4xl font-semibold">Create family + first student</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--muted)]">
              This flow creates the household record, primary parent contact, and the first student profile in one pass.
              Current mode: {formatRoleLabel(actor.activeRole)}.
            </p>
          </div>
          <Link
            href="/families"
            className="rounded-full border border-[var(--border)] bg-white/70 px-4 py-2 text-sm font-semibold"
          >
            Back to families
          </Link>
        </div>
      </section>

      <FlashBanner message={message} error={error} />

      <form action={createFamilyWithStudentAction} className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard
          eyebrow="Household"
          title="Family details"
          description="Household-level information used for ownership, parent access, and routing."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm md:col-span-2">
              <span className="font-semibold text-[var(--muted)]">Family label</span>
              <input
                name="familyLabel"
                required
                placeholder="Chen Family"
                className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-semibold text-[var(--muted)]">Parent contact name</span>
              <input
                name="parentContactName"
                required
                className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-semibold text-[var(--muted)]">Parent email</span>
              <input
                type="email"
                name="parentEmail"
                required
                className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-semibold text-[var(--muted)]">Strategist owner</span>
              <select
                name="strategistOwnerId"
                defaultValue={actor.activeRole === "strategist" ? actor.profileId : ""}
                disabled={actor.activeRole === "strategist"}
                className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none disabled:opacity-60"
              >
                <option value="">Assign later</option>
                {assignees.strategists.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-semibold text-[var(--muted)]">Ops owner</span>
              <select
                name="opsOwnerId"
                defaultValue=""
                className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
              >
                <option value="">Assign later</option>
                {assignees.ops.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.fullName}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Student"
          title="First student profile"
          description="The first student sets the initial operational posture for the family workspace."
        >
          <div className="grid gap-4 md:grid-cols-2">
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
                name="currentSat"
                min="0"
                placeholder="1410"
                className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-semibold text-[var(--muted)]">Projected SAT</span>
              <input
                type="number"
                name="projectedSat"
                min="0"
                placeholder="1500"
                className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-semibold text-[var(--muted)]">Current ACT</span>
              <input
                type="number"
                name="currentAct"
                min="0"
                placeholder="30"
                className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-semibold text-[var(--muted)]">Projected ACT</span>
              <input
                type="number"
                name="projectedAct"
                min="0"
                placeholder="33"
                className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
              />
            </label>
            <label className="space-y-2 text-sm md:col-span-2">
              <span className="font-semibold text-[var(--muted)]">Status reason</span>
              <textarea
                name="statusReason"
                required
                rows={4}
                className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
              />
            </label>
            <label className="space-y-2 text-sm md:col-span-2">
              <span className="font-semibold text-[var(--muted)]">Testing strategy note</span>
              <textarea
                name="strategyNote"
                rows={3}
                placeholder="Optional context for current/projected score planning"
                className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none"
              />
            </label>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="submit"
              disabled={!isSupabaseConfigured()}
              className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              Create family and first student
            </button>
            {!isSupabaseConfigured() ? (
              <p className="text-sm text-[var(--muted)]">
                Live Supabase credentials are required to write real records.
              </p>
            ) : null}
          </div>
        </SectionCard>
      </form>
    </div>
  );
}
