type MetricCardProps = {
  label: string;
  value: string;
  helper: string;
};

export function MetricCard({ label, value, helper }: MetricCardProps) {
  return (
    <div className="panel fade-up rounded-[1.75rem] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
        {label}
      </p>
      <p className="section-title mt-4 text-4xl font-semibold">{value}</p>
      <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{helper}</p>
    </div>
  );
}
