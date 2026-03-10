import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ApplicantDetailView } from "@/components/analytics/applicant-detail-view";
import { requireInternalAccess } from "@/lib/auth/session";
import { loadCollegebaseAnalyticsDataset } from "@/lib/domain/collegebase-analytics";

type Params = Promise<{ sourceId: string }>;

export default async function AnalyticsApplicantDetailPage({
  params,
}: {
  params: Params;
}) {
  const { sourceId } = await params;
  await requireInternalAccess(`/analytics/applicants/${sourceId}`);

  let dataset = null;
  let loadError: string | null = null;

  try {
    dataset = await loadCollegebaseAnalyticsDataset();
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : "Unable to load the local Collegebase analytics dataset.";
  }

  if (!dataset) {
    return (
      <div className="panel rounded-[2rem] p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
          Extracted profile
        </p>
        <h1 className="section-title mt-3 text-3xl font-semibold">Applicant detail is unavailable</h1>
        <p className="mt-4 text-base leading-8 text-[var(--muted)]">{loadError}</p>
      </div>
    );
  }

  const applicant = dataset.records.find((item) => item.sourceId === sourceId);
  if (!applicant) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/analytics"
        className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to analytics
      </Link>
      <ApplicantDetailView applicant={applicant} />
    </div>
  );
}

