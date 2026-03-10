import type { LucideIcon } from "lucide-react";

type SectionCardProps = {
  eyebrow: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
};

export function SectionCard({
  eyebrow,
  title,
  description,
  icon: Icon,
  children,
}: SectionCardProps) {
  return (
    <section className="panel fade-up rounded-[2rem] p-6 md:p-7">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
            {eyebrow}
          </p>
          <h2 className="section-title mt-3 text-2xl font-semibold">{title}</h2>
          {description ? (
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
              {description}
            </p>
          ) : null}
        </div>
        {Icon ? (
          <span className="rounded-full bg-white/80 p-3 text-[var(--accent)]">
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}
