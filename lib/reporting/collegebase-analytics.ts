import type {
  CollegebaseAnalyticsDataset,
  CollegebaseAnalyticsFilters,
  CollegebaseApplicantRecord,
  CollegebaseMetric,
  CollegebaseOutcome,
} from "@/lib/domain/collegebase-analytics";

export type CollegebaseOutcomeSummary = {
  outcome: CollegebaseOutcome;
  totalCount: number;
  averageSat?: number;
  satSampleSize: number;
  averageAct?: number;
  actSampleSize: number;
  averageGpa?: number;
  gpaSampleSize: number;
};

export type CollegebaseScatterPoint = {
  sourceId: string;
  label: string;
  x: number;
  y: number;
  outcome: CollegebaseOutcome;
};

export type CollegebaseApplicantRosterItem = {
  sourceId: string;
  label: string;
  subtitle: string;
  majors: string[];
  satComposite?: number;
  actComposite?: number;
  unweightedGpa?: number;
  acceptanceCount: number;
  rejectionCount: number;
  waitlistCount: number;
  activityCount: number;
  awardCount: number;
};

export type CollegebaseSchoolRow = {
  schoolName: string;
  acceptedCount: number;
  rejectedCount: number;
  totalCount: number;
};

export type CollegebaseAnalyticsSnapshot = {
  filters: CollegebaseAnalyticsFilters;
  filteredApplicantCount: number;
  totalOutcomeCount: number;
  selectedSchool?: string;
  coverage: {
    applicantCount: number;
    schoolCount: number;
    satCount: number;
    actCount: number;
    gpaCount: number;
    majorCount: number;
  };
  availableMajors: Array<{
    label: string;
    applicantCount: number;
  }>;
  availableSchools: string[];
  outcomeSummaries: CollegebaseOutcomeSummary[];
  schoolRows: CollegebaseSchoolRow[];
  roster: {
    accepted: CollegebaseApplicantRosterItem[];
    rejected: CollegebaseApplicantRosterItem[];
  };
  scatter: {
    metric: CollegebaseMetric;
    points: CollegebaseScatterPoint[];
    excludedCount: number;
  };
};

function roundAverage(value: number) {
  return Math.round(value * 100) / 100;
}

function average(values: number[]) {
  if (values.length === 0) return undefined;
  return roundAverage(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function matchesApplicantFilters(
  applicant: CollegebaseApplicantRecord,
  filters: Pick<
    CollegebaseAnalyticsFilters,
    "major" | "gpaMin" | "gpaMax" | "satMin" | "satMax" | "actMin" | "actMax"
  >,
) {
  if (filters.major && !applicant.normalizedMajors.includes(filters.major)) {
    return false;
  }

  const gpa = applicant.academics.unweightedGpa;
  if (filters.gpaMin != null && (gpa == null || gpa < filters.gpaMin)) {
    return false;
  }
  if (filters.gpaMax != null && (gpa == null || gpa > filters.gpaMax)) {
    return false;
  }

  const sat = applicant.academics.satComposite;
  if (filters.satMin != null && (sat == null || sat < filters.satMin)) {
    return false;
  }
  if (filters.satMax != null && (sat == null || sat > filters.satMax)) {
    return false;
  }

  const act = applicant.academics.actComposite;
  if (filters.actMin != null && (act == null || act < filters.actMin)) {
    return false;
  }
  if (filters.actMax != null && (act == null || act > filters.actMax)) {
    return false;
  }

  return true;
}

function buildOutcomeSummary(
  applicants: CollegebaseApplicantRecord[],
  outcome: CollegebaseOutcome,
): CollegebaseOutcomeSummary {
  const satValues = applicants
    .map((applicant) => applicant.academics.satComposite)
    .filter((value): value is number => value != null);
  const actValues = applicants
    .map((applicant) => applicant.academics.actComposite)
    .filter((value): value is number => value != null);
  const gpaValues = applicants
    .map((applicant) => applicant.academics.unweightedGpa)
    .filter((value): value is number => value != null);

  return {
    outcome,
    totalCount: applicants.length,
    averageSat: average(satValues),
    satSampleSize: satValues.length,
    averageAct: average(actValues),
    actSampleSize: actValues.length,
    averageGpa: average(gpaValues),
    gpaSampleSize: gpaValues.length,
  };
}

function buildRosterItem(applicant: CollegebaseApplicantRecord): CollegebaseApplicantRosterItem {
  return {
    sourceId: applicant.sourceId,
    label: applicant.profileLabel,
    subtitle: applicant.profileSubtitle,
    majors: applicant.normalizedMajors,
    satComposite: applicant.academics.satComposite,
    actComposite: applicant.academics.actComposite,
    unweightedGpa: applicant.academics.unweightedGpa,
    acceptanceCount: applicant.acceptanceSchoolNames.length,
    rejectionCount: applicant.schoolOutcomes.filter((item) => item.outcome === "rejected").length,
    waitlistCount: applicant.waitlistSchoolNames.length,
    activityCount: applicant.extracurricularItems.length,
    awardCount: applicant.awardItems.length,
  };
}

function sortRoster(items: CollegebaseApplicantRosterItem[]) {
  return [...items].sort((left, right) => {
    const leftScore = left.satComposite ?? left.actComposite ?? -1;
    const rightScore = right.satComposite ?? right.actComposite ?? -1;

    if (rightScore !== leftScore) return rightScore - leftScore;
    if ((right.unweightedGpa ?? -1) !== (left.unweightedGpa ?? -1)) {
      return (right.unweightedGpa ?? -1) - (left.unweightedGpa ?? -1);
    }

    return left.label.localeCompare(right.label);
  });
}

function filterApplicants(
  records: CollegebaseApplicantRecord[],
  filters: Pick<
    CollegebaseAnalyticsFilters,
    "major" | "gpaMin" | "gpaMax" | "satMin" | "satMax" | "actMin" | "actMax"
  >,
) {
  return records.filter((applicant) => matchesApplicantFilters(applicant, filters));
}

function filterSchoolOptions(
  applicants: CollegebaseApplicantRecord[],
  schoolQuery?: string,
) {
  const query = schoolQuery?.trim().toLowerCase();
  const allSchools = [...new Set(applicants.flatMap((applicant) => applicant.schoolOutcomes.map((item) => item.schoolName)))]
    .sort((left, right) => left.localeCompare(right));

  if (!query) return allSchools;

  return allSchools.filter((school) => school.toLowerCase().includes(query));
}

function filterMajorOptions(
  applicants: CollegebaseApplicantRecord[],
) {
  const counts = applicants.reduce<Map<string, number>>((map, applicant) => {
    for (const major of applicant.normalizedMajors) {
      map.set(major, (map.get(major) ?? 0) + 1);
    }
    return map;
  }, new Map<string, number>());

  return [...counts.entries()]
    .map(([label, applicantCount]) => ({ label, applicantCount }))
    .sort((left, right) => {
      if (right.applicantCount !== left.applicantCount) {
        return right.applicantCount - left.applicantCount;
      }
      return left.label.localeCompare(right.label);
    });
}

export function buildCollegebaseAnalyticsSnapshot(
  dataset: CollegebaseAnalyticsDataset,
  filters: CollegebaseAnalyticsFilters,
): CollegebaseAnalyticsSnapshot {
  const applicantsForOptions = filterApplicants(dataset.records, {
    major: undefined,
    gpaMin: filters.gpaMin,
    gpaMax: filters.gpaMax,
    satMin: filters.satMin,
    satMax: filters.satMax,
    actMin: filters.actMin,
    actMax: filters.actMax,
  });
  const filteredApplicants = filterApplicants(dataset.records, filters);
  const schoolLandscapeOutcomes = filteredApplicants.flatMap((applicant) => applicant.schoolOutcomes);
  const filteredSchoolOutcomes = filteredApplicants.flatMap((applicant) =>
    applicant.schoolOutcomes.filter((item) => !filters.school || item.schoolName === filters.school),
  );
  const schoolRows = [...schoolLandscapeOutcomes.reduce<Map<string, CollegebaseSchoolRow>>((map, outcome) => {
    const current =
      map.get(outcome.schoolName) ??
      {
        schoolName: outcome.schoolName,
        acceptedCount: 0,
        rejectedCount: 0,
        totalCount: 0,
      };

    current.totalCount += 1;
    if (outcome.outcome === "accepted") current.acceptedCount += 1;
    if (outcome.outcome === "rejected") current.rejectedCount += 1;

    map.set(outcome.schoolName, current);
    return map;
  }, new Map<string, CollegebaseSchoolRow>()).values()].sort((left, right) => {
    if (right.totalCount !== left.totalCount) return right.totalCount - left.totalCount;
    return left.schoolName.localeCompare(right.schoolName);
  });

  const acceptedApplicants = filteredApplicants.filter((applicant) =>
    applicant.schoolOutcomes.some(
      (item) => item.outcome === "accepted" && (!filters.school || item.schoolName === filters.school),
    ),
  );
  const rejectedApplicants = filteredApplicants.filter((applicant) =>
    applicant.schoolOutcomes.some(
      (item) => item.outcome === "rejected" && (!filters.school || item.schoolName === filters.school),
    ),
  );

  const acceptedSummary = buildOutcomeSummary(acceptedApplicants, "accepted");
  const rejectedSummary = buildOutcomeSummary(rejectedApplicants, "rejected");

  const scatterApplicants = filteredApplicants.filter((applicant) =>
    applicant.schoolOutcomes.some(
      (item) => item.schoolName === filters.school && item.outcome !== undefined,
    ),
  );
  const scatterPoints = filters.school
    ? filteredApplicants.flatMap((applicant) => {
        const gpa = applicant.academics.unweightedGpa;
        const score =
          filters.metric === "sat"
            ? applicant.academics.satComposite
            : applicant.academics.actComposite;

        if (gpa == null || score == null) return [];

        return applicant.schoolOutcomes
          .filter((item) => item.schoolName === filters.school)
          .map((item) => ({
            sourceId: applicant.sourceId,
            label: applicant.profileLabel,
            x: score,
            y: gpa,
            outcome: item.outcome,
          }));
      })
    : [];
  const scatterExcludedCount = filters.school
    ? scatterApplicants.filter((applicant) => {
        const gpa = applicant.academics.unweightedGpa;
        const score =
          filters.metric === "sat"
            ? applicant.academics.satComposite
            : applicant.academics.actComposite;

        return gpa == null || score == null;
      }).length
    : 0;

  const rosterAccepted = sortRoster(acceptedApplicants.map((applicant) => buildRosterItem(applicant)));
  const rosterRejected = sortRoster(rejectedApplicants.map((applicant) => buildRosterItem(applicant)));

  return {
    filters,
    filteredApplicantCount: filteredApplicants.length,
    totalOutcomeCount: filteredSchoolOutcomes.length,
    selectedSchool: filters.school,
    coverage: {
      applicantCount: filteredApplicants.length,
      schoolCount: new Set(schoolLandscapeOutcomes.map((item) => item.schoolName)).size,
      satCount: filteredApplicants.filter((applicant) => applicant.academics.satComposite != null).length,
      actCount: filteredApplicants.filter((applicant) => applicant.academics.actComposite != null).length,
      gpaCount: filteredApplicants.filter((applicant) => applicant.academics.unweightedGpa != null).length,
      majorCount: filteredApplicants.filter((applicant) => applicant.normalizedMajors.length > 0).length,
    },
    availableMajors: filterMajorOptions(applicantsForOptions),
    availableSchools: filterSchoolOptions(applicantsForOptions, filters.schoolQuery),
    outcomeSummaries: [acceptedSummary, rejectedSummary],
    schoolRows,
    roster: {
      accepted: filters.outcome === "rejected" ? [] : rosterAccepted,
      rejected: filters.outcome === "accepted" ? [] : rosterRejected,
    },
    scatter: {
      metric: filters.metric,
      points: scatterPoints,
      excludedCount: scatterExcludedCount,
    },
  };
}
