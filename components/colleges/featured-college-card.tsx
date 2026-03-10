/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";
import { BadgeDollarSign, MapPin, Sparkles, UsersRound } from "lucide-react";
import { formatCollegeMoney, formatCollegePercent } from "@/lib/domain/college-scorecard";
import type { BucketSuggestion, CollegeSearchResult } from "@/lib/domain/types";

type FeaturedCollegeCardProps = {
  school: CollegeSearchResult;
  suggestion: BucketSuggestion;
  actionSlot?: ReactNode;
};

const bucketTheme = {
  reach: {
    label: "Reach",
    solid: "var(--danger)",
    soft: "var(--danger-soft)",
  },
  target: {
    label: "Target",
    solid: "var(--warn)",
    soft: "var(--warn-soft)",
  },
  likely: {
    label: "Likely",
    solid: "var(--success)",
    soft: "var(--success-soft)",
  },
} as const;

export function FeaturedCollegeCard({
  school,
  suggestion,
  actionSlot,
}: FeaturedCollegeCardProps) {
  const activeTheme = bucketTheme[suggestion.bucket];
  const admissionRate = school.admissionRate ?? 0;
  const admissionDegrees = Math.max(8, Math.round(admissionRate * 360));
  const ringBackground = `conic-gradient(${activeTheme.solid} 0deg ${admissionDegrees}deg, rgba(255,255,255,0.28) ${admissionDegrees}deg 360deg)`;
  const heroAccent = school.heroAccent ?? activeTheme.solid;
  const statCards = [
    {
      label: "SAT average",
      value: school.satAverage ? String(school.satAverage) : "—",
      icon: Sparkles,
    },
    {
      label: "Sticker tuition",
      value: formatCollegeMoney(school.tuitionStickerPrice),
      icon: BadgeDollarSign,
    },
    {
      label: "Completion",
      value: formatCollegePercent(school.completionRate),
      icon: UsersRound,
    },
    {
      label: "10y earnings",
      value: formatCollegeMoney(school.medianEarnings),
      icon: BadgeDollarSign,
    },
  ];

  return (
    <article className="grain panel overflow-hidden rounded-[2rem]">
      <div className="relative h-[280px] overflow-hidden md:h-[340px]">
        {school.heroImage ? (
          <img
            src={school.heroImage}
            alt={school.heroImageAlt ?? `${school.schoolName} campus illustration`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            data-testid="featured-college-fallback"
            className="h-full w-full"
            style={{
              backgroundImage: `
                radial-gradient(circle at 18% 24%, rgba(255,255,255,0.42), transparent 19%),
                radial-gradient(circle at 83% 18%, rgba(255,255,255,0.16), transparent 14%),
                linear-gradient(140deg, ${heroAccent} 0%, rgba(28,42,38,0.94) 52%, rgba(95,71,48,0.88) 100%)
              `,
            }}
          >
            <div className="flex h-full items-end px-6 py-6 md:px-8">
              <div className="max-w-lg rounded-[1.5rem] border border-white/20 bg-[rgba(25,24,24,0.28)] px-5 py-4 text-white backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/72">
                  BeGifted college preview
                </p>
                <p className="mt-3 text-sm leading-7 text-white/86">
                  Curated imagery is not available for this school yet, so the featured card falls back to the route’s editorial campus treatment.
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(16,18,17,0.74)] via-[rgba(16,18,17,0.12)] to-transparent" />
        <div className="absolute left-5 top-5 flex h-24 w-24 flex-col items-center justify-center rounded-full border border-white/55 bg-[rgba(251,249,244,0.95)] text-center shadow-lg md:left-7 md:top-7 md:h-28 md:w-28">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            {activeTheme.label}
          </span>
          <span className="section-title mt-1 text-3xl font-semibold text-[var(--foreground)]">
            {suggestion.fitScore}
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 px-6 py-6 text-white md:px-8 md:py-7">
          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]"
                style={{ backgroundColor: activeTheme.soft, color: activeTheme.solid }}
              >
                {school.ownership}
              </span>
              {school.studentSize ? (
                <span className="rounded-full border border-white/28 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/86">
                  {school.studentSize.toLocaleString()} students
                </span>
              ) : null}
            </div>
            <h2 className="section-title mt-4 text-4xl font-semibold md:text-5xl">{school.schoolName}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/82 md:text-base">
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {school.city}, {school.state}
              </span>
              <span>BeGifted fit: {activeTheme.label}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-8 px-6 py-7 md:px-8 md:py-8 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
              Selection rationale
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">{suggestion.fitRationale}</p>
          </div>

          {school.matchedPrograms.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {school.matchedPrograms.map((program) => (
                <span
                  key={`${school.scorecardSchoolId}-${program.code}`}
                  className="rounded-full border border-[var(--border)] bg-white/78 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]"
                >
                  {program.title}
                </span>
              ))}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="rounded-[1.6rem] border border-[var(--border)] bg-white/72 p-4 shadow-[0_18px_35px_rgba(31,45,39,0.06)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                      {card.label}
                    </p>
                    <span className="rounded-full bg-[var(--background-soft)] p-2 text-[var(--accent)]">
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <p className="section-title mt-5 text-3xl font-semibold text-[var(--foreground)]">
                    {card.value}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[1.75rem] border border-[var(--border)] bg-white/78 p-5">
            <div className="flex items-start gap-5">
              <div className="flex flex-col items-center gap-4">
                <div
                  className="relative flex h-32 w-32 items-center justify-center rounded-full p-[10px]"
                  style={{ background: ringBackground }}
                  role="img"
                  aria-label={`Admission rate ${formatCollegePercent(school.admissionRate)}`}
                >
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-[var(--background-soft)]">
                    <div className="text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                        Admission
                      </p>
                      <p className="section-title mt-2 text-3xl font-semibold text-[var(--foreground)]">
                        {formatCollegePercent(school.admissionRate)}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-center text-sm leading-6 text-[var(--muted)]">
                  Acceptance posture stays visible without turning the explorer into a generic table.
                </p>
              </div>

              <div className="space-y-4">
                <div
                  className="inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]"
                  style={{ backgroundColor: activeTheme.soft, color: activeTheme.solid }}
                >
                  {activeTheme.label} bucket
                </div>
                <p className="text-sm leading-7 text-[var(--muted)]">
                  This featured card is the selected-school preview for the current result set. Add it to the active family list directly from here, then continue scanning the lighter results roster below.
                </p>
                {actionSlot}
              </div>
            </div>
          </div>

          {school.demographicMix && school.demographicMix.length > 0 ? (
            <div className="rounded-[1.75rem] border border-[var(--border)] bg-white/72 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                Campus diversity
              </p>
              <div
                className="mt-4 flex h-4 overflow-hidden rounded-full bg-[var(--background-soft)]"
                aria-label="Campus diversity breakdown"
              >
                {school.demographicMix.map((item) => (
                  <span
                    key={item.label}
                    title={`${item.label} ${formatCollegePercent(item.share)}`}
                    style={{
                      width: `${Math.max((item.share ?? 0) * 100, 4)}%`,
                      backgroundColor: item.colorToken,
                    }}
                  />
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                {school.demographicMix.map((item) => (
                  <div key={item.label} className="inline-flex items-center gap-2 text-sm text-[var(--muted)]">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.colorToken }}
                      aria-hidden="true"
                    />
                    <span>
                      {item.label} {formatCollegePercent(item.share)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
