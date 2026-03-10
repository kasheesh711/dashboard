import { describe, expect, it } from "vitest";
import { buildPortalCase, getDemoFamilies } from "@/lib/domain/dashboard";

describe("parent portal visibility", () => {
  it("exposes only parent-visible tasks and artifact links grouped by student", () => {
    const portal = buildPortalCase(getDemoFamilies(), "chen-family");

    expect(portal).not.toBeNull();
    expect(portal?.students.every((student) => student.tasks.every((task) => task.parentVisible))).toBe(
      true,
    );
    expect(
      portal?.students.every((student) =>
        student.artifactLinks.every((artifact) => artifact.parentVisible),
      ),
    ).toBe(true);
    expect(portal?.students.find((student) => student.slug === "emma-chen")?.artifactLinks).toHaveLength(1);
  });

  it("preserves monthly history per student while keeping the latest summary separate", () => {
    const portal = buildPortalCase(getDemoFamilies(), "chen-family");
    const emma = portal?.students.find((student) => student.slug === "emma-chen");

    expect(emma?.currentSummary?.reportingMonth).toBe("2026-03-01");
    expect(emma?.summaryHistory.map((item) => item.reportingMonth)).toEqual(["2026-02-01"]);
  });

  it("does not leak internal-only notes into the portal shape", () => {
    const portal = buildPortalCase(getDemoFamilies(), "singh-family");
    const priya = portal?.students.find((student) => student.slug === "priya-singh");

    expect(priya).not.toBeNull();
    expect("notes" in (priya as object)).toBe(false);
  });
});
