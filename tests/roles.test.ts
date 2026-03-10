import { describe, expect, it } from "vitest";
import {
  getDefaultActiveRole,
  getInternalRoles,
  resolveActiveRole,
} from "@/lib/auth/roles";

describe("role helpers", () => {
  it("defaults multi-role internal users to ops", () => {
    expect(getDefaultActiveRole(["strategist", "ops"])).toBe("ops");
  });

  it("falls back to the highest assigned role when the cookie is invalid", () => {
    expect(resolveActiveRole(["strategist", "ops"], "parent")).toBe("ops");
  });

  it("keeps only internal roles for internal access state", () => {
    expect(getInternalRoles(["parent", "strategist", "ops"])).toEqual([
      "ops",
      "strategist",
    ]);
  });
});
