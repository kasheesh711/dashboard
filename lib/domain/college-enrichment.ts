import type { CollegeSearchResult } from "@/lib/domain/types";

type CollegeSearchEnrichment = Pick<
  CollegeSearchResult,
  "heroImage" | "heroImageAlt" | "heroAccent"
>;

const collegeSearchEnrichmentBySchoolId: Record<number, CollegeSearchEnrichment> = {
  130794: {
    heroImage: "/college-hero-ivy.svg",
    heroImageAlt: "Illustrated collegiate gothic campus facade at dusk.",
    heroAccent: "#7f5f47",
  },
  166027: {
    heroImage: "/college-hero-ivy.svg",
    heroImageAlt: "Illustrated collegiate gothic courtyard in warm evening light.",
    heroAccent: "#72503f",
  },
  166683: {
    heroImage: "/college-hero-tech.svg",
    heroImageAlt: "Illustrated research campus skyline with modern academic buildings.",
    heroAccent: "#35576c",
  },
  186131: {
    heroImage: "/college-hero-ivy.svg",
    heroImageAlt: "Illustrated stone academic quad with warm window light.",
    heroAccent: "#74624a",
  },
  110662: {
    heroImage: "/college-hero-west.svg",
    heroImageAlt: "Illustrated campus hillside with arches and sunset sky.",
    heroAccent: "#9d6d2f",
  },
};

export function getCollegeSearchEnrichment(scorecardSchoolId: number): CollegeSearchEnrichment | undefined {
  return collegeSearchEnrichmentBySchoolId[scorecardSchoolId];
}
