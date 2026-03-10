import { describe, expect, it } from "vitest";
import { buildDashboardSnapshot, filterFamilies, getDemoFamilies, toFamilyListItem } from "@/lib/domain/dashboard";

describe("family triage filtering", () => {
  it("prioritizes households with red students before yellow and green", () => {
    const families = filterFamilies(getDemoFamilies(), { deadlineWindow: "30" }).map(
      toFamilyListItem,
    );

    expect(families[0]?.slug).toBe("singh-family");
  });

  it("returns only households with overdue work when overdue filter is used", () => {
    const families = filterFamilies(getDemoFamilies(), { deadlineWindow: "overdue" });
    const slugs = families.map((family) => family.slug);

    expect(slugs).toContain("singh-family");
    expect(slugs).toContain("rattanachai-family");
    expect(slugs).not.toContain("chen-family");
  });

  it("builds a student-first urgent queue", () => {
    const snapshot = buildDashboardSnapshot(getDemoFamilies());

    expect(snapshot.urgentStudents[0]?.slug).toBe("priya-singh");
    expect(snapshot.urgentStudents.some((student) => student.slug === "nathan-rattanachai")).toBe(
      true,
    );
  });
});
