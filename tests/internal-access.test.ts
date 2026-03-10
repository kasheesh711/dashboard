import { describe, expect, it } from "vitest";
import { listInternalFamilies } from "@/lib/db/queries";
import type { InternalAccess } from "@/lib/auth/session";

describe("internal access scoping", () => {
  const dualRoleActor: Omit<InternalAccess, "activeRole" | "familyScope"> = {
    mode: "demo",
    profileId: "demo-strategist-1",
    email: "alicia@example.com",
    fullName: "Alicia Wong",
    roles: ["ops", "strategist"],
  };

  it("downscopes dual-role users in strategist mode", async () => {
    const families = await listInternalFamilies({
      ...dualRoleActor,
      activeRole: "strategist",
      familyScope: "assigned",
    });

    expect(families.length).toBeGreaterThan(0);
    expect(families.every((family) => family.strategistOwnerName === "Alicia Wong")).toBe(
      true,
    );
    expect(families.some((family) => family.slug === "singh-family")).toBe(false);
  });

  it("keeps global scope in ops mode", async () => {
    const families = await listInternalFamilies({
      ...dualRoleActor,
      activeRole: "ops",
      familyScope: "all",
    });

    expect(families.some((family) => family.slug === "singh-family")).toBe(true);
    expect(families.some((family) => family.slug === "chen-family")).toBe(true);
  });
});
