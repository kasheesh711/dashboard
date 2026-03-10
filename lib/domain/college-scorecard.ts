import { getCollegeSearchEnrichment } from "@/lib/domain/college-enrichment";
import type {
  BucketSuggestion,
  CollegeDemographicMixItem,
  CollegeOwnership,
  CollegeSearchFilters,
  CollegeSearchResult,
  CollegeSortOption,
  FamilyCollegeListItem,
  FamilyCollegeStrategyProfile,
  FamilyWorkspace,
  SchoolBucket,
} from "@/lib/domain/types";

const BASE_URL = "https://api.data.gov/ed/collegescorecard/v1/schools";
const DEFAULT_PER_PAGE = 12;
const MAX_PER_PAGE = 20;

const defaultFields = [
  "id",
  "school.name",
  "school.city",
  "school.state",
  "school.ownership",
  "location.lat",
  "location.lon",
  "latest.student.size",
  "latest.admissions.admission_rate.overall",
  "latest.admissions.sat_scores.average.overall",
  "latest.completion.rate_suppressed.overall",
  "latest.student.retention_rate.four_year.full_time",
  "latest.cost.avg_net_price.overall",
  "latest.cost.tuition.in_state",
  "latest.cost.tuition.out_of_state",
  "latest.earnings.10_yrs_after_entry.median",
  "latest.student.demographics.race_ethnicity.white",
  "latest.student.demographics.race_ethnicity.asian",
  "latest.student.demographics.race_ethnicity.black",
  "latest.student.demographics.race_ethnicity.hispanic",
  "latest.student.demographics.race_ethnicity.aian",
  "latest.student.demographics.race_ethnicity.nhpi",
  "latest.student.demographics.race_ethnicity.two_or_more",
  "latest.student.demographics.race_ethnicity.non_resident_alien",
  "latest.student.demographics.race_ethnicity.unknown",
];

const sortFieldMap: Record<CollegeSortOption, string> = {
  name_asc: "school.name:asc",
  admission_rate_asc: "latest.admissions.admission_rate.overall:asc",
  admission_rate_desc: "latest.admissions.admission_rate.overall:desc",
  sat_average_desc: "latest.admissions.sat_scores.average.overall:desc",
  net_price_asc: "latest.cost.avg_net_price.overall:asc",
  earnings_desc: "latest.earnings.10_yrs_after_entry.median:desc",
  completion_desc: "latest.completion.rate_suppressed.overall:desc",
  size_desc: "latest.student.size:desc",
};

type ScorecardResponse = {
  metadata: {
    page: number;
    total: number;
    per_page: number;
  };
  results: ScorecardSchoolResult[];
};

type ScorecardProgramEntry = {
  code?: string;
  title?: string;
  credential?: {
    level?: number;
  };
};

type ScorecardRaceEthnicity = {
  white?: number;
  asian?: number;
  black?: number;
  hispanic?: number;
  aian?: number;
  nhpi?: number;
  two_or_more?: number;
  non_resident_alien?: number;
  unknown?: number;
};

type ScorecardSchoolResult = {
  id: number;
  school?: {
    name?: string;
    city?: string;
    state?: string;
    ownership?: number;
  };
  location?: {
    lat?: number;
    lon?: number;
  };
  latest?: {
    student?: {
      size?: number;
      retention_rate?: {
        four_year?: {
          full_time?: number;
        };
      };
      demographics?: {
        race_ethnicity?: ScorecardRaceEthnicity;
      };
    };
    admissions?: {
      admission_rate?: {
        overall?: number;
      };
      sat_scores?: {
        average?: {
          overall?: number;
        };
      };
    };
    completion?: {
      rate_suppressed?: {
        overall?: number;
      };
    };
    cost?: {
      avg_net_price?: {
        overall?: number;
      };
      tuition?: {
        in_state?: number;
        out_of_state?: number;
      };
    };
    earnings?: {
      "10_yrs_after_entry"?: {
        median?: number;
      };
    };
    programs?: {
      cip_4_digit?: ScorecardProgramEntry[];
    };
  };
  "school.name"?: string;
  "school.city"?: string;
  "school.state"?: string;
  "school.ownership"?: number;
  "location.lat"?: number;
  "location.lon"?: number;
  "latest.student.size"?: number;
  "latest.admissions.admission_rate.overall"?: number;
  "latest.admissions.sat_scores.average.overall"?: number;
  "latest.completion.rate_suppressed.overall"?: number;
  "latest.student.retention_rate.four_year.full_time"?: number;
  "latest.cost.avg_net_price.overall"?: number;
  "latest.cost.tuition.in_state"?: number;
  "latest.cost.tuition.out_of_state"?: number;
  "latest.earnings.10_yrs_after_entry.median"?: number;
  "latest.student.demographics.race_ethnicity.white"?: number;
  "latest.student.demographics.race_ethnicity.asian"?: number;
  "latest.student.demographics.race_ethnicity.black"?: number;
  "latest.student.demographics.race_ethnicity.hispanic"?: number;
  "latest.student.demographics.race_ethnicity.aian"?: number;
  "latest.student.demographics.race_ethnicity.nhpi"?: number;
  "latest.student.demographics.race_ethnicity.two_or_more"?: number;
  "latest.student.demographics.race_ethnicity.non_resident_alien"?: number;
  "latest.student.demographics.race_ethnicity.unknown"?: number;
};

export function isCollegeScorecardConfigured() {
  return Boolean(process.env.COLLEGE_SCORECARD_API_KEY);
}

export function mapCollegeOwnership(value?: number | null): CollegeOwnership {
  switch (value) {
    case 1:
      return "Public";
    case 2:
      return "Private nonprofit";
    case 3:
      return "Private for-profit";
    default:
      return "Unknown";
  }
}

function getFieldValue<T>(record: ScorecardSchoolResult, dottedKey: keyof ScorecardSchoolResult) {
  return record[dottedKey] as T | undefined;
}

function getMatchedPrograms(record: ScorecardSchoolResult, programCode?: string) {
  const nestedPrograms = record.latest?.programs?.cip_4_digit ?? [];
  const bachelorsPrograms = nestedPrograms.filter(
    (entry) => entry.credential?.level === 3 && entry.code && entry.title,
  ) as Array<Required<Pick<ScorecardProgramEntry, "code" | "title">>>;

  if (!programCode) return [];

  return bachelorsPrograms
    .filter((entry) => entry.code === programCode)
    .map((entry) => ({
      code: entry.code,
      title: entry.title,
    }));
}

function mapDemographicMix(record: ScorecardSchoolResult): CollegeDemographicMixItem[] | undefined {
  const raceEthnicity = {
    white:
      getFieldValue<number>(record, "latest.student.demographics.race_ethnicity.white") ??
      record.latest?.student?.demographics?.race_ethnicity?.white,
    asian:
      getFieldValue<number>(record, "latest.student.demographics.race_ethnicity.asian") ??
      record.latest?.student?.demographics?.race_ethnicity?.asian,
    black:
      getFieldValue<number>(record, "latest.student.demographics.race_ethnicity.black") ??
      record.latest?.student?.demographics?.race_ethnicity?.black,
    hispanic:
      getFieldValue<number>(record, "latest.student.demographics.race_ethnicity.hispanic") ??
      record.latest?.student?.demographics?.race_ethnicity?.hispanic,
    aian:
      getFieldValue<number>(record, "latest.student.demographics.race_ethnicity.aian") ??
      record.latest?.student?.demographics?.race_ethnicity?.aian,
    nhpi:
      getFieldValue<number>(record, "latest.student.demographics.race_ethnicity.nhpi") ??
      record.latest?.student?.demographics?.race_ethnicity?.nhpi,
    twoOrMore:
      getFieldValue<number>(record, "latest.student.demographics.race_ethnicity.two_or_more") ??
      record.latest?.student?.demographics?.race_ethnicity?.two_or_more,
    nonResidentAlien:
      getFieldValue<number>(record, "latest.student.demographics.race_ethnicity.non_resident_alien") ??
      record.latest?.student?.demographics?.race_ethnicity?.non_resident_alien,
    unknown:
      getFieldValue<number>(record, "latest.student.demographics.race_ethnicity.unknown") ??
      record.latest?.student?.demographics?.race_ethnicity?.unknown,
  };

  const otherShare = (
    [
      raceEthnicity.aian,
      raceEthnicity.nhpi,
      raceEthnicity.twoOrMore,
      raceEthnicity.nonResidentAlien,
      raceEthnicity.unknown,
    ] as Array<number | undefined>
  ).reduce<number>((sum, value) => sum + (value ?? 0), 0);

  const demographicMix: CollegeDemographicMixItem[] = [
    { label: "White", share: raceEthnicity.white, colorToken: "#403C39" },
    { label: "Asian", share: raceEthnicity.asian, colorToken: "#4196DF" },
    { label: "Black", share: raceEthnicity.black, colorToken: "#8C58B2" },
    { label: "Hispanic", share: raceEthnicity.hispanic, colorToken: "#E68A1E" },
    { label: "Other", share: otherShare > 0 ? otherShare : undefined, colorToken: "#1D9D63" },
  ].filter((item) => item.share != null && item.share > 0);

  return demographicMix.length > 0 ? demographicMix : undefined;
}

function getTuitionStickerPrice(record: ScorecardSchoolResult, ownership: CollegeOwnership) {
  const inState =
    getFieldValue<number>(record, "latest.cost.tuition.in_state") ??
    record.latest?.cost?.tuition?.in_state;
  const outOfState =
    getFieldValue<number>(record, "latest.cost.tuition.out_of_state") ??
    record.latest?.cost?.tuition?.out_of_state;

  if (ownership === "Public") {
    return outOfState ?? inState;
  }

  return inState ?? outOfState;
}

export function mapCollegeSearchResult(
  record: ScorecardSchoolResult,
  programCode?: string,
): CollegeSearchResult {
  const ownership = mapCollegeOwnership(
    getFieldValue<number>(record, "school.ownership") ?? record.school?.ownership,
  );

  return {
    scorecardSchoolId: record.id,
    schoolName: getFieldValue<string>(record, "school.name") ?? record.school?.name ?? "Unknown school",
    city: getFieldValue<string>(record, "school.city") ?? record.school?.city ?? "Unknown city",
    state: getFieldValue<string>(record, "school.state") ?? record.school?.state ?? "Unknown state",
    ownership,
    studentSize: getFieldValue<number>(record, "latest.student.size") ?? record.latest?.student?.size,
    admissionRate:
      getFieldValue<number>(record, "latest.admissions.admission_rate.overall") ??
      record.latest?.admissions?.admission_rate?.overall,
    satAverage:
      getFieldValue<number>(record, "latest.admissions.sat_scores.average.overall") ??
      record.latest?.admissions?.sat_scores?.average?.overall,
    completionRate:
      getFieldValue<number>(record, "latest.completion.rate_suppressed.overall") ??
      record.latest?.completion?.rate_suppressed?.overall,
    retentionRate:
      getFieldValue<number>(record, "latest.student.retention_rate.four_year.full_time") ??
      record.latest?.student?.retention_rate?.four_year?.full_time,
    averageNetPrice:
      getFieldValue<number>(record, "latest.cost.avg_net_price.overall") ??
      record.latest?.cost?.avg_net_price?.overall,
    medianEarnings:
      getFieldValue<number>(record, "latest.earnings.10_yrs_after_entry.median") ??
      record.latest?.earnings?.["10_yrs_after_entry"]?.median,
    tuitionStickerPrice: getTuitionStickerPrice(record, ownership),
    latitude: getFieldValue<number>(record, "location.lat") ?? record.location?.lat,
    longitude: getFieldValue<number>(record, "location.lon") ?? record.location?.lon,
    matchedPrograms: getMatchedPrograms(record, programCode),
    demographicMix: mapDemographicMix(record),
  };
}

export function enrichCollegeSearchResult(school: CollegeSearchResult): CollegeSearchResult {
  return {
    ...school,
    ...getCollegeSearchEnrichment(school.scorecardSchoolId),
  };
}

export function clampPerPage(value?: number) {
  if (!value || Number.isNaN(value)) return DEFAULT_PER_PAGE;
  return Math.min(Math.max(value, 1), MAX_PER_PAGE);
}

function appendRange(
  params: URLSearchParams,
  key: string,
  min?: number,
  max?: number,
) {
  if (min == null && max == null) return;

  const left = min ?? "";
  const right = max ?? "";
  params.set(`${key}__range`, `${left}..${right}`);
}

function appendMinimum(params: URLSearchParams, key: string, min?: number) {
  if (min == null) return;
  params.set(`${key}__range`, `${min}..`);
}

function getOwnershipParam(ownership?: CollegeSearchFilters["ownership"]) {
  switch (ownership) {
    case "Public":
      return "1";
    case "Private nonprofit":
      return "2";
    case "Private for-profit":
      return "3";
    default:
      return undefined;
  }
}

export function buildCollegeScorecardUrl(filters: CollegeSearchFilters) {
  const params = new URLSearchParams();
  const apiKey = process.env.COLLEGE_SCORECARD_API_KEY;

  if (!apiKey) {
    throw new Error("College Scorecard API key is not configured.");
  }

  params.set("api_key", apiKey);
  params.set("school.degrees_awarded.predominant", "3");
  params.set("keys_nested", "true");
  params.set("page", String(Math.max(filters.page ?? 0, 0)));
  params.set("per_page", String(clampPerPage(filters.perPage)));
  params.set("sort", sortFieldMap[filters.sort ?? "name_asc"]);

  if (filters.programCode) {
    params.set("all_programs_nested", "true");
    params.set("latest.programs.cip_4_digit.code", filters.programCode);
    params.set("fields", [...defaultFields, "latest.programs"].join(","));
  } else {
    params.set("fields", defaultFields.join(","));
  }

  if (filters.query) params.set("school.name", filters.query);
  if (filters.state) params.set("school.state", filters.state);
  if (filters.city) params.set("school.city", filters.city);

  const ownership = getOwnershipParam(filters.ownership);
  if (ownership) params.set("school.ownership", ownership);

  appendRange(params, "latest.student.size", filters.sizeMin, filters.sizeMax);
  appendRange(
    params,
    "latest.admissions.admission_rate.overall",
    filters.admissionRateMin,
    filters.admissionRateMax,
  );
  appendRange(
    params,
    "latest.admissions.sat_scores.average.overall",
    filters.satMin,
    filters.satMax,
  );
  appendMinimum(params, "latest.completion.rate_suppressed.overall", filters.completionMin);
  appendMinimum(
    params,
    "latest.student.retention_rate.four_year.full_time",
    filters.retentionMin,
  );
  appendMinimum(params, "latest.earnings.10_yrs_after_entry.median", filters.earningsMin);

  if (filters.netPriceMax != null) {
    params.set("latest.cost.avg_net_price.overall__range", `..${filters.netPriceMax}`);
  }

  if (filters.zip) params.set("zip", filters.zip);
  if (filters.distance) params.set("distance", filters.distance);

  return `${BASE_URL}?${params.toString()}`;
}

export async function searchCollegeScorecard(filters: CollegeSearchFilters) {
  if (!isCollegeScorecardConfigured()) {
    return {
      filters,
      total: 0,
      page: 0,
      perPage: clampPerPage(filters.perPage),
      results: [] as CollegeSearchResult[],
    };
  }

  const response = await fetch(buildCollegeScorecardUrl(filters), {
    cache: "no-store",
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("College Scorecard rate limit reached. Retry in a moment.");
    }

    throw new Error("Unable to load College Scorecard data.");
  }

  const payload = (await response.json()) as ScorecardResponse;

  return {
    filters,
    total: payload.metadata.total,
    page: payload.metadata.page,
    perPage: payload.metadata.per_page,
    results: payload.results.map((record) =>
      enrichCollegeSearchResult(mapCollegeSearchResult(record, filters.programCode)),
    ),
  };
}

const actToSatMap: Record<number, number> = {
  24: 1180,
  25: 1210,
  26: 1240,
  27: 1280,
  28: 1320,
  29: 1350,
  30: 1390,
  31: 1420,
  32: 1450,
  33: 1490,
  34: 1520,
  35: 1560,
  36: 1590,
};

function convertActToSat(act?: number) {
  if (!act) return undefined;
  if (act <= 24) return 1180;
  if (act >= 36) return 1590;
  return actToSatMap[act] ?? undefined;
}

function getProjectedSatEquivalent(profile?: FamilyCollegeStrategyProfile) {
  if (!profile) return undefined;
  return (
    profile.projectedSat ??
    profile.currentSat ??
    convertActToSat(profile.projectedAct) ??
    convertActToSat(profile.currentAct)
  );
}

function scoreSelectivity(profile: FamilyCollegeStrategyProfile | undefined, school: CollegeSearchResult) {
  const projectedSat = getProjectedSatEquivalent(profile);
  if (projectedSat && school.satAverage) {
    const delta = projectedSat - school.satAverage;
    if (delta >= 60) return 60;
    if (delta >= 20) return 54;
    if (delta >= -20) return 48;
    if (delta >= -60) return 40;
    if (delta >= -100) return 28;
    return 18;
  }

  if (school.admissionRate == null) return 30;
  if (school.admissionRate >= 0.5) return 48;
  if (school.admissionRate >= 0.35) return 42;
  if (school.admissionRate >= 0.2) return 36;
  if (school.admissionRate >= 0.1) return 24;
  return 12;
}

function scoreOutcomes(school: CollegeSearchResult) {
  const completion = Math.round((school.completionRate ?? 0.5) * 10);
  const retention = Math.round((school.retentionRate ?? 0.75) * 8);

  let earnings = 4;
  if ((school.medianEarnings ?? 0) >= 90000) earnings = 7;
  else if ((school.medianEarnings ?? 0) >= 75000) earnings = 6;
  else if ((school.medianEarnings ?? 0) >= 60000) earnings = 5;

  return Math.min(completion + retention + earnings, 25);
}

function scoreProgramMatch(profile: FamilyCollegeStrategyProfile | undefined, school: CollegeSearchResult) {
  if (!profile || profile.intendedMajorCodes.length === 0) return 8;
  return school.matchedPrograms.length > 0 ? 15 : 0;
}

export function suggestCollegeBucket(
  profile: FamilyCollegeStrategyProfile | undefined,
  school: CollegeSearchResult,
): BucketSuggestion {
  const projectedSat = getProjectedSatEquivalent(profile);
  let bucket: SchoolBucket = "target";

  if (projectedSat && school.satAverage) {
    const delta = projectedSat - school.satAverage;
    if (delta >= 40 && (school.admissionRate ?? 1) >= 0.18) {
      bucket = "likely";
    } else if (delta >= -40 && (school.admissionRate ?? 1) >= 0.08) {
      bucket = "target";
    } else {
      bucket = "reach";
    }
  } else if (school.admissionRate != null) {
    if (school.admissionRate >= 0.35) bucket = "likely";
    else if (school.admissionRate >= 0.15) bucket = "target";
    else bucket = "reach";
  }

  const fitScore = Math.max(
    0,
    Math.min(100, scoreSelectivity(profile, school) + scoreOutcomes(school) + scoreProgramMatch(profile, school)),
  );

  const rationaleParts = [
    projectedSat || school.satAverage
      ? "Bucket uses projected testing against the institution average."
      : "Bucket falls back to admission rate because testing data is limited.",
    school.matchedPrograms.length > 0
      ? "Selected major is available in the bachelor's program data."
      : "Program fit is neutral because no matching bachelor's major was selected.",
    "Cost remains visible but does not change the bucket automatically in v1.",
  ];

  return {
    bucket,
    fitScore,
    fitRationale: rationaleParts.join(" "),
  };
}

export function getCurrentFamilyCollegeList(family: FamilyWorkspace) {
  return (
    family.collegeLists.find((list) => list.isCurrent) ??
    [...family.collegeLists].sort((left, right) => left.listName.localeCompare(right.listName))[0] ??
    null
  );
}

export function getFeaturedCollegeSearchResult(
  results: CollegeSearchResult[],
  selectedScorecardSchoolId?: number,
) {
  if (results.length === 0) return null;
  if (!selectedScorecardSchoolId) return results[0];

  return (
    results.find((school) => school.scorecardSchoolId === selectedScorecardSchoolId) ??
    results[0]
  );
}

export function getPrimaryUsCollegeStudent(family: FamilyWorkspace) {
  return family.students.find((student) => student.pathway === "us_college") ?? null;
}

export function groupCollegeListItemsByBucket(items: FamilyCollegeListItem[]) {
  return {
    reach: items.filter((item) => item.bucket === "reach"),
    target: items.filter((item) => item.bucket === "target"),
    likely: items.filter((item) => item.bucket === "likely"),
  };
}

export function makeCollegeListItemInput(
  familyCollegeListId: string,
  school: CollegeSearchResult,
  suggestion: BucketSuggestion,
  sortOrder: number,
) {
  return {
    familyCollegeListId,
    scorecardSchoolId: school.scorecardSchoolId,
    schoolName: school.schoolName,
    city: school.city,
    state: school.state,
    ownership: school.ownership,
    studentSize: school.studentSize,
    admissionRate: school.admissionRate,
    satAverage: school.satAverage,
    completionRate: school.completionRate,
    retentionRate: school.retentionRate,
    averageNetPrice: school.averageNetPrice,
    medianEarnings: school.medianEarnings,
    matchedProgramCodes: school.matchedPrograms.map((item) => item.code),
    matchedProgramLabels: school.matchedPrograms.map((item) => item.title),
    bucket: suggestion.bucket,
    bucketSource: "system" as const,
    fitScore: suggestion.fitScore,
    fitRationale: suggestion.fitRationale,
    counselorNote: undefined,
    sortOrder,
  };
}

export function formatCollegePercent(value?: number) {
  return value == null ? "—" : `${Math.round(value * 100)}%`;
}

export function formatCollegeMoney(value?: number) {
  return value == null ? "—" : `$${value.toLocaleString()}`;
}
