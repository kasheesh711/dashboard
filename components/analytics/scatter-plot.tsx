import type { CollegebaseMetric } from "@/lib/domain/collegebase-analytics";
import type { CollegebaseScatterPoint } from "@/lib/reporting/collegebase-analytics";

type ScatterPlotProps = {
  points: CollegebaseScatterPoint[];
  metric: CollegebaseMetric;
};

const WIDTH = 720;
const HEIGHT = 420;
const PADDING = {
  top: 24,
  right: 28,
  bottom: 48,
  left: 60,
};

function getMetricLabel(metric: CollegebaseMetric) {
  return metric === "sat" ? "SAT" : "ACT";
}

function getMetricDomain(points: CollegebaseScatterPoint[], metric: CollegebaseMetric) {
  if (points.length === 0) {
    return metric === "sat" ? { min: 900, max: 1600 } : { min: 18, max: 36 };
  }

  const values = points.map((point) => point.x);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = metric === "sat" ? 40 : 1;

  return {
    min: Math.floor((min - padding) / padding) * padding,
    max: Math.ceil((max + padding) / padding) * padding,
  };
}

function getGpaDomain(points: CollegebaseScatterPoint[]) {
  if (points.length === 0) {
    return { min: 2.5, max: 4.2 };
  }

  const values = points.map((point) => point.y);
  const min = Math.max(0, Math.floor((Math.min(...values) - 0.15) * 10) / 10);
  const max = Math.min(5, Math.ceil((Math.max(...values) + 0.15) * 10) / 10);

  return { min, max };
}

function scale(
  value: number,
  domainMin: number,
  domainMax: number,
  rangeMin: number,
  rangeMax: number,
) {
  if (domainMax === domainMin) {
    return (rangeMin + rangeMax) / 2;
  }

  return rangeMin + ((value - domainMin) / (domainMax - domainMin)) * (rangeMax - rangeMin);
}

export function ScatterPlot({ points, metric }: ScatterPlotProps) {
  const metricLabel = getMetricLabel(metric);
  const xDomain = getMetricDomain(points, metric);
  const yDomain = getGpaDomain(points);
  const xTicks = Array.from({ length: 5 }, (_, index) =>
    Math.round(xDomain.min + ((xDomain.max - xDomain.min) / 4) * index),
  );
  const yTicks = Array.from({ length: 5 }, (_, index) =>
    Number((yDomain.min + ((yDomain.max - yDomain.min) / 4) * index).toFixed(2)),
  );

  return (
    <div className="rounded-[1.75rem] border border-[var(--border)] bg-white/80 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{metricLabel} vs GPA</p>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
            Accepted and rejected outcomes at the selected school
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
            Accepted
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--danger)]" />
            Rejected
          </span>
        </div>
      </div>
      <svg
        aria-label={`${metricLabel} versus GPA scatter plot`}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
      >
        <rect x="0" y="0" width={WIDTH} height={HEIGHT} rx="24" fill="#fcfaf6" />

        {yTicks.map((tick) => {
          const y = scale(tick, yDomain.min, yDomain.max, HEIGHT - PADDING.bottom, PADDING.top);
          return (
            <g key={tick}>
              <line
                x1={PADDING.left}
                x2={WIDTH - PADDING.right}
                y1={y}
                y2={y}
                stroke="#e6ddd0"
                strokeDasharray="4 6"
              />
              <text x={PADDING.left - 12} y={y + 4} textAnchor="end" fontSize="12" fill="#7b6e63">
                {tick.toFixed(2)}
              </text>
            </g>
          );
        })}

        {xTicks.map((tick) => {
          const x = scale(tick, xDomain.min, xDomain.max, PADDING.left, WIDTH - PADDING.right);
          return (
            <g key={tick}>
              <line
                x1={x}
                x2={x}
                y1={PADDING.top}
                y2={HEIGHT - PADDING.bottom}
                stroke="#efe7db"
              />
              <text x={x} y={HEIGHT - PADDING.bottom + 24} textAnchor="middle" fontSize="12" fill="#7b6e63">
                {tick}
              </text>
            </g>
          );
        })}

        <line
          x1={PADDING.left}
          x2={PADDING.left}
          y1={PADDING.top}
          y2={HEIGHT - PADDING.bottom}
          stroke="#8e8073"
        />
        <line
          x1={PADDING.left}
          x2={WIDTH - PADDING.right}
          y1={HEIGHT - PADDING.bottom}
          y2={HEIGHT - PADDING.bottom}
          stroke="#8e8073"
        />

        {points.map((point) => {
          const x = scale(point.x, xDomain.min, xDomain.max, PADDING.left, WIDTH - PADDING.right);
          const y = scale(point.y, yDomain.min, yDomain.max, HEIGHT - PADDING.bottom, PADDING.top);

          return (
            <g key={`${point.sourceId}-${point.outcome}`}>
              <title>{point.label}</title>
              <circle
                cx={x}
                cy={y}
                r="5.5"
                fill={point.outcome === "accepted" ? "var(--accent)" : "var(--danger)"}
                fillOpacity="0.8"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            </g>
          );
        })}

        <text
          x={WIDTH / 2}
          y={HEIGHT - 10}
          textAnchor="middle"
          fontSize="13"
          fill="#403c39"
        >
          {metricLabel}
        </text>
        <text
          x="16"
          y={HEIGHT / 2}
          textAnchor="middle"
          fontSize="13"
          fill="#403c39"
          transform={`rotate(-90 16 ${HEIGHT / 2})`}
        >
          Unweighted GPA
        </text>
      </svg>

      {points.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--muted)]">
          No applicants have both {metricLabel} and unweighted GPA for this filtered school view.
        </p>
      ) : null}
    </div>
  );
}
