import clsx from "clsx";
import type { OverallStatus, TaskComputedStatus } from "@/lib/domain/types";

type StatusBadgeProps = {
  status: OverallStatus | TaskComputedStatus;
  kind?: "case" | "task";
};

const statusMap: Record<string, string> = {
  green: "bg-[var(--success-soft)] text-[var(--success)]",
  yellow: "bg-[var(--warn-soft)] text-[var(--warn)]",
  red: "bg-[var(--danger-soft)] text-[var(--danger)]",
  not_started: "bg-slate-100 text-slate-700",
  in_progress: "bg-[var(--accent-soft)] text-[var(--accent)]",
  blocked: "bg-[var(--warn-soft)] text-[var(--warn)]",
  done: "bg-[var(--success-soft)] text-[var(--success)]",
  overdue: "bg-[var(--danger-soft)] text-[var(--danger)]",
};

export function StatusBadge({ status, kind = "case" }: StatusBadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
        statusMap[status],
        kind === "case" ? "min-w-[96px] justify-center" : "",
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}
