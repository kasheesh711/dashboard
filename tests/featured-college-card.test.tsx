import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FeaturedCollegeCard } from "@/components/colleges/featured-college-card";
import type { BucketSuggestion, CollegeSearchResult } from "@/lib/domain/types";

function makeSuggestion(overrides: Partial<BucketSuggestion> = {}): BucketSuggestion {
  return {
    bucket: "target",
    fitScore: 82,
    fitRationale: "Projected testing and available programs keep this school in the core target band.",
    ...overrides,
  };
}

function makeSchool(overrides: Partial<CollegeSearchResult> = {}): CollegeSearchResult {
  return {
    scorecardSchoolId: 166027,
    schoolName: "Sample University",
    city: "Cambridge",
    state: "MA",
    ownership: "Private nonprofit",
    studentSize: 21000,
    admissionRate: 0.14,
    satAverage: 1450,
    completionRate: 0.9,
    retentionRate: 0.94,
    averageNetPrice: 28000,
    medianEarnings: 88000,
    tuitionStickerPrice: 61200,
    matchedPrograms: [{ code: "1107", title: "Computer Science" }],
    demographicMix: [
      { label: "White", share: 0.32, colorToken: "#403C39" },
      { label: "Asian", share: 0.24, colorToken: "#4196DF" },
    ],
    heroImage: "/college-hero-ivy.svg",
    heroImageAlt: "Illustrated collegiate courtyard.",
    heroAccent: "#72503f",
    ...overrides,
  };
}

describe("FeaturedCollegeCard", () => {
  it("renders the enriched hero, stats, and family action slot", () => {
    render(
      <FeaturedCollegeCard
        school={makeSchool()}
        suggestion={makeSuggestion()}
        actionSlot={<button type="button">Add to Dream List</button>}
      />,
    );

    expect(
      screen.getByRole("img", { name: "Illustrated collegiate courtyard." }),
    ).toBeInTheDocument();
    expect(screen.getByText("Sample University")).toBeInTheDocument();
    expect(screen.getByText("Campus diversity")).toBeInTheDocument();
    expect(screen.getByText("Add to Dream List")).toBeInTheDocument();
    expect(screen.getByText("$61,200")).toBeInTheDocument();
  });

  it("renders the branded fallback when curated imagery is missing", () => {
    render(
      <FeaturedCollegeCard
        school={makeSchool({ heroImage: undefined, heroImageAlt: undefined })}
        suggestion={makeSuggestion()}
      />,
    );

    expect(screen.getByTestId("featured-college-fallback")).toBeInTheDocument();
    expect(screen.getByText("BeGifted college preview")).toBeInTheDocument();
  });

  it("omits the diversity section when demographic data is unavailable", () => {
    render(
      <FeaturedCollegeCard
        school={makeSchool({ demographicMix: undefined })}
        suggestion={makeSuggestion()}
      />,
    );

    expect(screen.queryByText("Campus diversity")).not.toBeInTheDocument();
  });
});
