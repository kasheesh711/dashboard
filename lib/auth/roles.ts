import type { AppRole } from "@/lib/domain/types";

export type InternalRole = Extract<AppRole, "strategist" | "ops">;

export const ACTIVE_ROLE_COOKIE_NAME = "bg_active_role";
export const ACTIVE_ROLE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

const rolePriority: AppRole[] = ["ops", "strategist", "parent"];

export function dedupeRoles(roles: AppRole[]): AppRole[] {
  return [...new Set(roles)].sort(
    (left, right) => rolePriority.indexOf(left) - rolePriority.indexOf(right),
  );
}

export function getInternalRoles(roles: AppRole[]): InternalRole[] {
  return dedupeRoles(roles).filter(
    (role): role is InternalRole => role === "ops" || role === "strategist",
  );
}

export function getDefaultActiveRole(roles: AppRole[]): AppRole | null {
  return dedupeRoles(roles)[0] ?? null;
}

export function resolveActiveRole(
  roles: AppRole[],
  requestedRole?: string | null,
): AppRole | null {
  const assignedRoles = dedupeRoles(roles);

  if (requestedRole) {
    const normalized = requestedRole.trim().toLowerCase() as AppRole;
    if (assignedRoles.includes(normalized)) {
      return normalized;
    }
  }

  return getDefaultActiveRole(assignedRoles);
}

export function isParentOnlyRoleSet(roles: AppRole[]) {
  const assignedRoles = dedupeRoles(roles);
  return assignedRoles.length === 1 && assignedRoles[0] === "parent";
}

export function formatRoleLabel(role: AppRole) {
  return role === "ops" ? "Ops" : role === "strategist" ? "Strategist" : "Parent";
}
