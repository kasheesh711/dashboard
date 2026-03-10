import Link from "next/link";
import {
  ChartColumn,
  Files,
  GraduationCap,
  House,
  LayoutDashboard,
  LogIn,
  School,
  Users,
} from "lucide-react";
import { switchActiveRole } from "@/app/sign-in/actions";
import { getAppModeLabel } from "@/lib/auth/config";
import { formatRoleLabel, getInternalRoles } from "@/lib/auth/roles";
import { getOptionalSessionAccess } from "@/lib/auth/session";

const navItems = [
  { href: "/", label: "Workspace", icon: House },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/families", label: "Families", icon: Users },
  { href: "/analytics", label: "Analytics", icon: ChartColumn },
  { href: "/colleges", label: "Colleges", icon: School },
  { href: "/students/new", label: "Students", icon: GraduationCap },
  { href: "/portal", label: "Parent Portal", icon: Files },
  { href: "/sign-in", label: "Sign In", icon: LogIn },
];

export async function SiteShell({ children }: { children: React.ReactNode }) {
  const actor = await getOptionalSessionAccess();
  const internalRoles = actor ? getInternalRoles(actor.roles) : [];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[rgba(248,245,238,0.84)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 md:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3">
              <span className="section-title rounded-full bg-[var(--accent)] px-3 py-2 text-sm font-semibold tracking-[0.16em] text-white">
                BG
              </span>
              <div>
                <p className="section-title text-lg font-semibold">BeGifted Dashboard</p>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                  MVP workspace
                </p>
              </div>
            </Link>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/60 px-3 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-white"
              >
                <Icon className="h-4 w-4 text-[var(--muted)]" />
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-wrap items-center justify-end gap-3">
            {actor ? (
              <div className="rounded-[1.5rem] border border-[var(--border)] bg-white/70 px-4 py-3 text-right">
                <p className="text-sm font-semibold text-[var(--foreground)]">{actor.fullName}</p>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                  {actor.mode === "demo"
                    ? "Demo internal access"
                    : `Current mode: ${
                        actor.activeRole ? formatRoleLabel(actor.activeRole) : "Unassigned"
                      }`}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Roles: {actor.roles.map((role) => formatRoleLabel(role)).join(" / ")}
                </p>
                {internalRoles.length > 1 ? (
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    {internalRoles.map((role) => (
                      <form key={role} action={switchActiveRole}>
                        <input type="hidden" name="nextRole" value={role} />
                        <button
                          type="submit"
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] ${
                            actor.activeRole === role
                              ? "bg-[var(--accent)] text-white"
                              : "border border-[var(--border)] bg-white text-[var(--foreground)]"
                          }`}
                        >
                          {formatRoleLabel(role)}
                        </button>
                      </form>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="inline-flex items-center rounded-full border border-[var(--border)] bg-white/70 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              {getAppModeLabel()}
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-10">
        {children}
      </main>
    </div>
  );
}
