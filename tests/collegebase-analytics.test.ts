import { describe, expect, it } from "vitest";
import {
  loadCollegebaseAnalyticsDatasetFromFile,
  parseCollegebaseAnalyticsDataset,
  type CollegebaseAnalyticsFilters,
} from "@/lib/domain/collegebase-analytics";
import { buildCollegebaseAnalyticsSnapshot } from "@/lib/reporting/collegebase-analytics";

function makeDataset() {
  return parseCollegebaseAnalyticsDataset({
    records: [
      {
        sourceId: "alpha1111",
        listName: "all",
        sourceCardIndex: 1,
        applicationYearLabel: "2024",
        overview: {
          badges: ["3.8+", "1500+/34+"],
          intendedMajors: ["Computer science", "llustration"],
          raceLabel: "Asian",
          genderLabel: "Female",
        },
        academics: {
          satComposite: 1520,
          unweightedGpa: 3.92,
          weightedGpa: 4.45,
          rawItems: {},
        },
        extracurricularItems: [{ sortOrder: 1, description: "Research lead" }],
        awardItems: [{ sortOrder: 1, description: "National Merit" }],
        acceptanceSchoolNames: ["Yale University", "Brown University"],
        otherSections: {
          Rejections: {
            kind: "list",
            value: ["Stanford University"],
          },
          Waitlists: {
            kind: "list",
            value: ["Columbia University"],
          },
        },
      },
      {
        sourceId: "beta2222",
        listName: "all",
        sourceCardIndex: 2,
        applicationYearLabel: "2024",
        overview: {
          badges: ["3.6+", "31+"],
          intendedMajors: ["Computer Science"],
        },
        academics: {
          actComposite: 33,
          unweightedGpa: 3.74,
          rawItems: {},
        },
        extracurricularItems: [{ sortOrder: 1, description: "Debate captain" }],
        awardItems: [],
        acceptanceSchoolNames: ["Stanford University"],
        otherSections: {
          Rejections: {
            kind: "list",
            value: ["Yale University"],
          },
        },
      },
      {
        sourceId: "gamma3333",
        listName: "all",
        sourceCardIndex: 3,
        applicationYearLabel: "2024",
        overview: {
          badges: [],
          intendedMajors: ["Economics"],
        },
        academics: {
          satComposite: 1450,
          actComposite: 32,
          rawItems: {},
        },
        extracurricularItems: [],
        awardItems: [],
        acceptanceSchoolNames: [],
        otherSections: {
          Rejections: {
            kind: "list",
            value: ["Yale University"],
          },
        },
      },
    ],
  });
}

function makeFilters(overrides: Partial<CollegebaseAnalyticsFilters> = {}): CollegebaseAnalyticsFilters {
  return {
    metric: "sat",
    outcome: "all",
    ...overrides,
  };
}

describe("collegebase analytics domain", () => {
  it("normalizes majors with light cleanup and merges case-only variants", () => {
    const dataset = makeDataset();

    expect(dataset.availableMajors[0]).toEqual({
      label: "Computer Science",
      applicantCount: 2,
    });
    expect(dataset.records[0].normalizedMajors).toContain("Illustration");
  });

  it("flattens accepted and rejected school outcomes while keeping waitlists separate", () => {
    const dataset = makeDataset();
    const first = dataset.records[0];

    expect(first.schoolOutcomes).toEqual([
      { schoolName: "Yale University", outcome: "accepted" },
      { schoolName: "Brown University", outcome: "accepted" },
      { schoolName: "Stanford University", outcome: "rejected" },
    ]);
    expect(first.waitlistSchoolNames).toEqual(["Columbia University"]);
  });

  it("builds accepted versus rejected summaries and scatter exclusions for a selected school", () => {
    const snapshot = buildCollegebaseAnalyticsSnapshot(
      makeDataset(),
      makeFilters({ school: "Yale University", metric: "sat" }),
    );

    expect(snapshot.outcomeSummaries).toEqual([
      expect.objectContaining({
        outcome: "accepted",
        totalCount: 1,
        averageSat: 1520,
        averageGpa: 3.92,
      }),
      expect.objectContaining({
        outcome: "rejected",
        totalCount: 2,
        averageSat: 1450,
        satSampleSize: 1,
        gpaSampleSize: 1,
      }),
    ]);
    expect(snapshot.scatter.points).toEqual([
      expect.objectContaining({ sourceId: "alpha1111", outcome: "accepted", x: 1520, y: 3.92 }),
    ]);
    expect(snapshot.scatter.excludedCount).toBe(2);
  });

  it("filters applicant pools by major and score ranges", () => {
    const snapshot = buildCollegebaseAnalyticsSnapshot(
      makeDataset(),
      makeFilters({ major: "Computer Science", satMin: 1500 }),
    );

    expect(snapshot.filteredApplicantCount).toBe(1);
    expect(snapshot.outcomeSummaries[0]).toEqual(
      expect.objectContaining({
        outcome: "accepted",
        totalCount: 1,
        averageSat: 1520,
      }),
    );
    expect(snapshot.availableMajors.map((item) => item.label)).toContain("Computer Science");
  });

  it("throws a clear error when the dataset file is missing", async () => {
    await expect(
      loadCollegebaseAnalyticsDatasetFromFile("/tmp/does-not-exist-collegebase.json"),
    ).rejects.toThrow("Collegebase analytics dataset not found");
  });
});
