import { cache } from "react";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

export type CollegebaseOutcome = "accepted" | "rejected";
export type CollegebaseMetric = "sat" | "act";
export type CollegebaseOutcomeFilter = "all" | CollegebaseOutcome;

export type CollegebaseAnalyticsFilters = {
  school?: string;
  schoolQuery?: string;
  major?: string;
  gpaMin?: number;
  gpaMax?: number;
  satMin?: number;
  satMax?: number;
  actMin?: number;
  actMax?: number;
  metric: CollegebaseMetric;
  outcome: CollegebaseOutcomeFilter;
};

type CollegebaseListSection = {
  kind: "list";
  value: string[];
};

type CollegebaseTextSection = {
  kind: "text";
  value: string;
};

type CollegebaseKvSection = {
  kind: "kv";
  value: Record<string, string>;
};

export type CollegebaseOtherSection =
  | CollegebaseListSection
  | CollegebaseTextSection
  | CollegebaseKvSection;

export type CollegebaseSchoolOutcome = {
  schoolName: string;
  outcome: CollegebaseOutcome;
};

export type CollegebaseApplicantRecord = {
  sourceId: string;
  listName: string;
  sourceCardIndex: number;
  applicationYearLabel?: string;
  overview: {
    badges: string[];
    intendedMajors: string[];
    raceLabel?: string;
    genderLabel?: string;
  };
  academics: {
    satComposite?: number;
    actComposite?: number;
    unweightedGpa?: number;
    weightedGpa?: number;
    classRankDisplay?: string;
    classRankNumerator?: number;
    classRankDenominator?: number;
    apCourseCount?: number;
    ibCourseCount?: number;
    rawItems: Record<string, string>;
  };
  extracurricularItems: Array<{
    sortOrder: number;
    description: string;
  }>;
  awardItems: Array<{
    sortOrder: number;
    description: string;
  }>;
  acceptanceSchoolNames: string[];
  otherSections: Record<string, CollegebaseOtherSection>;
  sourceSnapshot?: {
    url?: string;
    title?: string;
  };
  normalizedMajors: string[];
  schoolOutcomes: CollegebaseSchoolOutcome[];
  waitlistSchoolNames: string[];
  profileLabel: string;
  profileSubtitle: string;
};

export type CollegebaseAnalyticsDataset = {
  records: CollegebaseApplicantRecord[];
  availableMajors: Array<{
    label: string;
    applicantCount: number;
  }>;
  availableSchools: string[];
};

const DEFAULT_DATASET_PATH = path.join(
  process.cwd(),
  "tmp/collegebase/collegebase-applications.normalized.json",
);

const listSectionSchema = z.object({
  kind: z.literal("list"),
  value: z.array(z.string()).default([]),
});

const textSectionSchema = z.object({
  kind: z.literal("text"),
  value: z.string(),
});

const kvSectionSchema = z.object({
  kind: z.literal("kv"),
  value: z.record(z.string(), z.string()),
});

const otherSectionSchema = z.union([listSectionSchema, textSectionSchema, kvSectionSchema]);

const rawApplicantSchema = z.object({
  sourceId: z.string().min(1),
  listName: z.string().default("all"),
  sourceCardIndex: z.coerce.number().int().nonnegative().default(0),
  applicationYearLabel: z.string().optional(),
  overview: z
    .object({
      badges: z.array(z.string()).default([]),
      intendedMajors: z.array(z.string()).default([]),
      raceLabel: z.string().optional(),
      genderLabel: z.string().optional(),
    })
    .default({ badges: [], intendedMajors: [] }),
  academics: z
    .object({
      satComposite: z.coerce.number().int().min(200).max(1600).optional(),
      actComposite: z.coerce.number().int().min(1).max(36).optional(),
      unweightedGpa: z.coerce.number().min(0).max(5).optional(),
      weightedGpa: z.coerce.number().min(0).max(6).optional(),
      classRankDisplay: z.string().optional(),
      classRankNumerator: z.coerce.number().int().positive().optional(),
      classRankDenominator: z.coerce.number().int().positive().optional(),
      apCourseCount: z.coerce.number().int().min(0).optional(),
      ibCourseCount: z.coerce.number().int().min(0).optional(),
      rawItems: z.record(z.string(), z.string()).default({}),
    })
    .default({ rawItems: {} }),
  extracurricularItems: z
    .array(
      z.object({
        sortOrder: z.coerce.number().int().nonnegative(),
        description: z.string().min(1),
      }),
    )
    .default([]),
  awardItems: z
    .array(
      z.object({
        sortOrder: z.coerce.number().int().nonnegative(),
        description: z.string().min(1),
      }),
    )
    .default([]),
  acceptanceSchoolNames: z.array(z.string()).default([]),
  otherSections: z.record(z.string(), otherSectionSchema).default({}),
  sourceSnapshot: z
    .object({
      url: z.string().optional(),
      title: z.string().optional(),
    })
    .optional(),
});

const rawDatasetSchema = z.object({
  records: z.array(rawApplicantSchema),
});

type RawApplicantRecord = z.infer<typeof rawApplicantSchema>;

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function repairMajorLabel(value: string) {
  const normalized = normalizeWhitespace(value);
  if (!normalized) return normalized;

  return normalized
    .replace(/^ll(?=[a-z])/u, "Ill")
    .replace(/\bll(?=[a-z]{4,})/gu, "Ill");
}

function variantRank(label: string) {
  if (label === label.toUpperCase()) return 0;
  if (/[A-Z]/u.test(label) && /[a-z]/u.test(label)) return 1;
  return 2;
}

function uppercaseCount(label: string) {
  return [...label].filter((character) => /[A-Z]/u.test(character)).length;
}

function dedupeStrings(values: string[]) {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const value of values) {
    const normalized = normalizeWhitespace(value);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(normalized);
  }

  return deduped;
}

function getListSection(
  sections: Record<string, CollegebaseOtherSection>,
  key: string,
) {
  const section = sections[key];
  return section?.kind === "list" ? section.value : [];
}

function getTextSection(
  sections: Record<string, CollegebaseOtherSection>,
  key: string,
) {
  const section = sections[key];
  return section?.kind === "text" ? section.value : undefined;
}

function formatScoreLabel(record: RawApplicantRecord) {
  const parts: string[] = [];

  if (record.academics.satComposite != null) {
    parts.push(`SAT ${record.academics.satComposite}`);
  }
  if (record.academics.actComposite != null) {
    parts.push(`ACT ${record.academics.actComposite}`);
  }
  if (record.academics.unweightedGpa != null) {
    parts.push(`GPA ${record.academics.unweightedGpa.toFixed(2)}`);
  }

  return parts.join(" • ");
}

function formatProfileLabel(record: RawApplicantRecord, normalizedMajors: string[]) {
  const parts = [record.applicationYearLabel ?? "Unknown year"];
  const majorLabel = normalizedMajors.slice(0, 2).join(" / ");
  const scoreLabel = formatScoreLabel(record);

  if (majorLabel) parts.push(majorLabel);
  if (scoreLabel) parts.push(scoreLabel);

  parts.push(record.sourceId.slice(0, 6));

  return parts.join(" • ");
}

function buildCanonicalMajorMap(records: RawApplicantRecord[]) {
  const variantCounts = new Map<string, Map<string, number>>();

  for (const record of records) {
    for (const major of record.overview.intendedMajors) {
      const repaired = repairMajorLabel(major);
      if (!repaired) continue;
      const key = repaired.toLowerCase();
      const variants = variantCounts.get(key) ?? new Map<string, number>();
      variants.set(repaired, (variants.get(repaired) ?? 0) + 1);
      variantCounts.set(key, variants);
    }
  }

  const canonicalMap = new Map<string, string>();

  for (const [key, variants] of variantCounts) {
    const preferred = [...variants.entries()]
      .sort((left, right) => {
        if (right[1] !== left[1]) return right[1] - left[1];
        if (variantRank(left[0]) !== variantRank(right[0])) {
          return variantRank(left[0]) - variantRank(right[0]);
        }
        if (uppercaseCount(right[0]) !== uppercaseCount(left[0])) {
          return uppercaseCount(right[0]) - uppercaseCount(left[0]);
        }
        return left[0].localeCompare(right[0]);
      })[0]?.[0];

    if (preferred) {
      canonicalMap.set(key, preferred);
    }
  }

  return canonicalMap;
}

function normalizeMajors(record: RawApplicantRecord, canonicalMap: Map<string, string>) {
  const normalized = record.overview.intendedMajors
    .map((major) => repairMajorLabel(major))
    .filter(Boolean)
    .map((major) => canonicalMap.get(major.toLowerCase()) ?? major);

  return dedupeStrings(normalized);
}

function buildSchoolOutcomes(record: RawApplicantRecord): CollegebaseSchoolOutcome[] {
  const accepted = record.acceptanceSchoolNames.map((schoolName) => ({
    schoolName: normalizeWhitespace(schoolName),
    outcome: "accepted" as const,
  }));
  const rejected = getListSection(record.otherSections, "Rejections").map((schoolName) => ({
    schoolName: normalizeWhitespace(schoolName),
    outcome: "rejected" as const,
  }));

  return [...accepted, ...rejected].filter((item) => item.schoolName);
}

function buildApplicantRecord(
  record: RawApplicantRecord,
  canonicalMap: Map<string, string>,
): CollegebaseApplicantRecord {
  const normalizedMajors = normalizeMajors(record, canonicalMap);
  const scoreLabel = formatScoreLabel(record);

  return {
    ...record,
    acceptanceSchoolNames: dedupeStrings(record.acceptanceSchoolNames),
    normalizedMajors,
    schoolOutcomes: buildSchoolOutcomes(record),
    waitlistSchoolNames: dedupeStrings(getListSection(record.otherSections, "Waitlists")),
    profileLabel: formatProfileLabel(record, normalizedMajors),
    profileSubtitle:
      scoreLabel ||
      getTextSection(record.otherSections, "Assigned Category") ||
      `Record ${record.sourceId.slice(0, 8)}`,
  };
}

export function parseCollegebaseAnalyticsDataset(input: unknown): CollegebaseAnalyticsDataset {
  const parsed = rawDatasetSchema.parse(input);
  const canonicalMap = buildCanonicalMajorMap(parsed.records);
  const records = parsed.records.map((record) => buildApplicantRecord(record, canonicalMap));

  const availableMajors = [...records]
    .flatMap((record) => record.normalizedMajors)
    .reduce<Map<string, number>>((counts, major) => {
      counts.set(major, (counts.get(major) ?? 0) + 1);
      return counts;
    }, new Map<string, number>());

  const availableSchools = [...new Set(records.flatMap((record) => record.schoolOutcomes.map((item) => item.schoolName)))]
    .sort((left, right) => left.localeCompare(right));

  return {
    records,
    availableMajors: [...availableMajors.entries()]
      .map(([label, applicantCount]) => ({ label, applicantCount }))
      .sort((left, right) => {
        if (right.applicantCount !== left.applicantCount) {
          return right.applicantCount - left.applicantCount;
        }
        return left.label.localeCompare(right.label);
      }),
    availableSchools,
  };
}

export async function loadCollegebaseAnalyticsDatasetFromFile(
  filePath = DEFAULT_DATASET_PATH,
) {
  try {
    const raw = await readFile(filePath, "utf8");
    return parseCollegebaseAnalyticsDataset(JSON.parse(raw));
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      throw new Error(`Collegebase analytics dataset not found at ${filePath}.`);
    }

    if (error instanceof SyntaxError) {
      throw new Error("Collegebase analytics dataset is not valid JSON.");
    }

    if (error instanceof z.ZodError) {
      throw new Error("Collegebase analytics dataset does not match the expected normalized schema.");
    }

    throw error;
  }
}

export const loadCollegebaseAnalyticsDataset = cache(async () =>
  loadCollegebaseAnalyticsDatasetFromFile(),
);
