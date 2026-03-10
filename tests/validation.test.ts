import { describe, expect, it } from "vitest";
import {
  analyticsFiltersSchema,
  collegeSearchFiltersSchema,
  createStudentSchema,
  familyWithStudentSchema,
  familyCollegeListItemSchema,
  familyCollegeStrategyProfileSchema,
  monthlySummarySchema,
  taskSchema,
  testingProfileSchema,
} from "@/lib/validation/schema";

describe("schema validation", () => {
  it("requires a sufficiently descriptive status reason when creating a family and first student", () => {
    const result = familyWithStudentSchema.safeParse({
      familyLabel: "Morgan Family",
      parentContactName: "Parent",
      parentEmail: "parent@example.com",
      studentName: "Alex Morgan",
      gradeLevel: "Grade 11",
      pathway: "us_college",
      tier: "Core",
      currentPhase: "Build",
      overallStatus: "red",
      statusReason: "short",
    });

    expect(result.success).toBe(false);
  });

  it("requires exactly three next actions for a monthly summary", () => {
    const result = monthlySummarySchema.safeParse({
      reportingMonth: "2026-03-01",
      biggestWin: "A detailed win that is long enough.",
      biggestRisk: "A detailed risk that is long enough.",
      topNextActions: ["One", "Two"],
      parentVisibleSummary:
        "This parent summary is intentionally long enough to satisfy the schema.",
      internalSummaryNotes: "Internal summary note is long enough.",
    });

    expect(result.success).toBe(false);
  });

  it("accepts overdue task state for persisted records", () => {
    const result = taskSchema.safeParse({
      itemName: "Recover missing packet",
      category: "application",
      owner: "Ops",
      dueDate: "2026-03-01",
      status: "overdue",
      parentVisible: false,
    });

    expect(result.success).toBe(true);
  });

  it("accepts student creation with testing baselines", () => {
    const result = createStudentSchema.safeParse({
      studentName: "Alex Morgan",
      gradeLevel: "Grade 10",
      pathway: "us_college",
      tier: "Core",
      currentPhase: "Launch",
      overallStatus: "green",
      statusReason: "The student has a clear launch plan and no active blockers.",
      currentSat: "1310",
      projectedSat: "1450",
      strategyNote: "Retest after six weeks of focused prep.",
    });

    expect(result.success).toBe(true);
  });

  it("parses numeric testing fields as optional numbers", () => {
    const result = testingProfileSchema.safeParse({
      currentSat: "1450",
      projectedSat: "",
      currentAct: "",
      projectedAct: "33",
      strategyNote: "Balanced prep plan.",
    });

    expect(result.success).toBe(true);
    expect(result.data?.currentSat).toBe(1450);
    expect(result.data?.projectedAct).toBe(33);
    expect(result.data?.projectedSat).toBeUndefined();
  });

  it("accepts blank family college testing inputs and major arrays", () => {
    const result = familyCollegeStrategyProfileSchema.safeParse({
      currentSat: "",
      projectedSat: "1520",
      currentAct: "",
      projectedAct: "",
      intendedMajorCodes: ["1107", "5202"],
      intendedMajorLabels: ["Computer Science", "Business Administration"],
      strategyNote: "Prioritize strong urban programs.",
    });

    expect(result.success).toBe(true);
    expect(result.data?.projectedSat).toBe(1520);
    expect(result.data?.currentSat).toBeUndefined();
  });

  it("rejects invalid family college list item bucket sources", () => {
    const result = familyCollegeListItemSchema.safeParse({
      scorecardSchoolId: 110662,
      schoolName: "University of California, Berkeley",
      city: "Berkeley",
      state: "CA",
      ownership: "Public",
      bucket: "target",
      bucketSource: "auto",
      fitScore: 88,
      fitRationale: "Projected testing and outcomes point to a strong target.",
      matchedProgramCodes: ["1107"],
      matchedProgramLabels: ["Computer Science"],
    });

    expect(result.success).toBe(false);
  });

  it("normalizes percentage filter inputs into decimal ranges", () => {
    const result = collegeSearchFiltersSchema.safeParse({
      query: "Boston",
      admissionRateMin: "10",
      admissionRateMax: "25",
      completionMin: "80",
      retentionMin: "90",
      perPage: "20",
      sort: "size_desc",
      selected: "166683",
    });

    expect(result.success).toBe(true);
    expect(result.data?.admissionRateMin).toBe(0.1);
    expect(result.data?.admissionRateMax).toBe(0.25);
    expect(result.data?.completionMin).toBe(0.8);
    expect(result.data?.retentionMin).toBe(0.9);
    expect(result.data?.selected).toBe(166683);
  });

  it("rejects unsupported college search sort values", () => {
    const result = collegeSearchFiltersSchema.safeParse({
      query: "Boston",
      sort: "roi_desc",
    });

    expect(result.success).toBe(false);
  });

  it("parses analytics filters with GPA decimals and outcome toggles", () => {
    const result = analyticsFiltersSchema.safeParse({
      school: "Yale University",
      major: "Computer Science",
      gpaMin: "3.75",
      gpaMax: "4.0",
      satMin: "1450",
      actMax: "35",
      metric: "act",
      outcome: "accepted",
    });

    expect(result.success).toBe(true);
    expect(result.data?.gpaMin).toBe(3.75);
    expect(result.data?.gpaMax).toBe(4);
    expect(result.data?.satMin).toBe(1450);
    expect(result.data?.actMax).toBe(35);
    expect(result.data?.metric).toBe("act");
    expect(result.data?.outcome).toBe("accepted");
  });
});
