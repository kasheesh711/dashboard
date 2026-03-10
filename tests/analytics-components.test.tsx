import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ApplicantDetailView } from "@/components/analytics/applicant-detail-view";
import { ScatterPlot } from "@/components/analytics/scatter-plot";
import type { CollegebaseApplicantRecord } from "@/lib/domain/collegebase-analytics";

function makeApplicant(overrides: Partial<CollegebaseApplicantRecord> = {}): CollegebaseApplicantRecord {
  return {
    sourceId: "alpha1111",
    listName: "all",
    sourceCardIndex: 1,
    applicationYearLabel: "2024",
    overview: {
      badges: ["3.8+", "1500+/34+"],
      intendedMajors: ["Computer Science"],
      raceLabel: "Asian",
      genderLabel: "Female",
    },
    academics: {
      satComposite: 1510,
      actComposite: 34,
      unweightedGpa: 3.91,
      weightedGpa: 4.47,
      classRankDisplay: "4/320",
      apCourseCount: 9,
      ibCourseCount: 0,
      rawItems: {},
    },
    extracurricularItems: [{ sortOrder: 1, description: "Research internship" }],
    awardItems: [{ sortOrder: 1, description: "National Merit Scholar" }],
    acceptanceSchoolNames: ["Yale University"],
    otherSections: {
      Rejections: { kind: "list", value: ["Stanford University"] },
      Waitlists: { kind: "list", value: ["Columbia University"] },
      Tags: { kind: "list", value: ["Research", "Leadership"] },
      Rating: { kind: "kv", value: { "Overall Score": "72.4" } },
    },
    sourceSnapshot: { url: "https://app.collegebase.org/", title: "Collegebase" },
    normalizedMajors: ["Computer Science"],
    schoolOutcomes: [
      { schoolName: "Yale University", outcome: "accepted" },
      { schoolName: "Stanford University", outcome: "rejected" },
    ],
    waitlistSchoolNames: ["Columbia University"],
    profileLabel: "2024 • Computer Science • SAT 1510 • GPA 3.91 • alpha1",
    profileSubtitle: "SAT 1510 • ACT 34 • GPA 3.91",
    ...overrides,
  };
}

describe("analytics components", () => {
  it("renders the scatter plot legend and point titles", () => {
    render(
      <ScatterPlot
        metric="sat"
        points={[
          { sourceId: "alpha1111", label: "Applicant A", x: 1510, y: 3.91, outcome: "accepted" },
          { sourceId: "beta2222", label: "Applicant B", x: 1450, y: 3.7, outcome: "rejected" },
        ]}
      />,
    );

    expect(screen.getByRole("img", { name: "SAT versus GPA scatter plot" })).toBeInTheDocument();
    expect(screen.getByText("Accepted")).toBeInTheDocument();
    expect(screen.getByText("Rejected")).toBeInTheDocument();
  });

  it("renders a graceful empty scatter state", () => {
    render(<ScatterPlot metric="act" points={[]} />);

    expect(
      screen.getByText("No applicants have both ACT and unweighted GPA for this filtered school view."),
    ).toBeInTheDocument();
  });

  it("renders applicant detail sections and optional profile notes", () => {
    render(<ApplicantDetailView applicant={makeApplicant()} />);

    expect(screen.getByText("School decisions")).toBeInTheDocument();
    expect(screen.getByText("Extracurricular profile")).toBeInTheDocument();
    expect(screen.getByText("National Merit Scholar")).toBeInTheDocument();
    expect(screen.getByText("Research")).toBeInTheDocument();
    expect(screen.getByText("Collegebase")).toBeInTheDocument();
  });
});

