import { MailCheck } from "lucide-react";
import { SectionCard } from "@/components/shared/section-card";
import { getAppModeLabel, isSupabaseConfigured } from "@/lib/auth/config";
import { requestMagicLink } from "@/app/sign-in/actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getStringValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const errorMap: Record<string, string> = {
  missing_email: "Enter an email address to receive the magic link.",
  demo_mode: "Supabase is not configured yet, so sign-in is disabled and the workspace is running in demo mode.",
  profile_not_linked:
    "Your email is not linked to a dashboard profile yet. Add a matching profile row before signing in again.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolved = await searchParams;
  const sent = getStringValue(resolved.sent);
  const rawError = getStringValue(resolved.error);
  const next = getStringValue(resolved.next) ?? "/dashboard";
  const message = rawError ? errorMap[rawError] ?? rawError : null;
  const live = isSupabaseConfigured();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <section className="panel rounded-[2rem] px-6 py-8 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
          Authentication
        </p>
        <h1 className="section-title mt-3 text-4xl font-semibold">Magic-link sign in</h1>
        <p className="mt-4 text-base leading-8 text-[var(--muted)]">
          Internal users and parents use the same login entry point. Access scope is
          determined by the linked Supabase profile, assigned roles, and family
          contact record.
        </p>
      </section>

      <SectionCard
        eyebrow="Mode"
        title={getAppModeLabel()}
        description="In demo mode the form stays visible but sign-in is intentionally disabled."
        icon={MailCheck}
      >
        <form action={requestMagicLink} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <label className="block space-y-2 text-sm">
            <span className="font-semibold text-[var(--muted)]">Email</span>
            <input
              type="email"
              name="email"
              placeholder="name@example.com"
              disabled={!live}
              className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 outline-none disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
          <button
            type="submit"
            disabled={!live}
            className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Send magic link
          </button>
        </form>
        {sent ? (
          <p className="mt-4 rounded-2xl bg-[var(--success-soft)] px-4 py-3 text-sm text-[var(--success)]">
            Magic link sent. Check your inbox and complete the redirect back to `/auth/callback`.
          </p>
        ) : null}
        {message ? (
          <p className="mt-4 rounded-2xl bg-[var(--warn-soft)] px-4 py-3 text-sm text-[var(--warn)]">
            {message}
          </p>
        ) : null}
      </SectionCard>
    </div>
  );
}
