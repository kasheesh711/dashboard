import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AppRole } from "@/lib/domain/types";
import {
  ACTIVE_ROLE_COOKIE_NAME,
  getInternalRoles,
  isParentOnlyRoleSet,
  resolveActiveRole,
  type InternalRole,
} from "@/lib/auth/roles";
import { isSupabaseConfigured } from "@/lib/auth/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ProfileRoleRecord = {
  role: AppRole;
};

type ProfileRecord = {
  id: string;
  email: string;
  full_name: string;
  profile_roles?: ProfileRoleRecord[] | null;
};

type LiveActor = {
  profileId: string;
  email: string;
  fullName: string;
  roles: AppRole[];
};

type LiveActorLookup =
  | { kind: "no_session" }
  | { kind: "unlinked_profile" }
  | { kind: "actor"; actor: LiveActor };

export type InternalAccess = {
  mode: "demo" | "live";
  profileId: string;
  email: string;
  fullName: string;
  roles: InternalRole[];
  activeRole: InternalRole;
  familyScope: "assigned" | "all";
};

export type SessionAccess =
  | {
      mode: "demo";
      email: string;
      fullName: string;
      roles: InternalRole[];
      activeRole: InternalRole;
    }
  | {
      mode: "live";
      profileId: string;
      email: string;
      fullName: string;
      roles: AppRole[];
      activeRole: AppRole | null;
    };

export type PortalAccess =
  | {
      mode: "demo";
      enabled: true;
    }
  | {
      mode: "live";
      enabled: boolean;
      roles: AppRole[];
      activeRole: AppRole | null;
      profileId?: string;
      email?: string;
      fullName?: string;
    };

function mapRoles(profile: ProfileRecord): AppRole[] {
  return (profile.profile_roles ?? []).map((item) => item.role);
}

async function getActiveRoleCookieValue() {
  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_ROLE_COOKIE_NAME)?.value ?? null;
}

async function getLiveActorLookup(): Promise<LiveActorLookup> {
  if (!isSupabaseConfigured()) {
    return { kind: "no_session" };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { kind: "no_session" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,email,full_name,profile_roles(role)")
    .eq("auth_user_id", user.id)
    .maybeSingle<ProfileRecord>();

  if (profileError || !profile) {
    return { kind: "unlinked_profile" };
  }

  return {
    kind: "actor",
    actor: {
      profileId: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      roles: mapRoles(profile),
    },
  };
}

async function getOptionalLiveActor(): Promise<LiveActor | null> {
  const lookup = await getLiveActorLookup();
  return lookup.kind === "actor" ? lookup.actor : null;
}

async function getRequiredLiveActor(redirectTarget: string): Promise<LiveActor> {
  const lookup = await getLiveActorLookup();

  if (lookup.kind === "no_session") {
    redirect(`/sign-in?next=${encodeURIComponent(redirectTarget)}`);
  }

  if (lookup.kind === "unlinked_profile") {
    redirect(
      `/sign-in?error=profile_not_linked&next=${encodeURIComponent(redirectTarget)}`,
    );
  }

  return lookup.actor;
}

export async function getOptionalSessionAccess(): Promise<SessionAccess | null> {
  if (!isSupabaseConfigured()) {
    return {
      mode: "demo",
      email: "demo@begifted.example",
      fullName: "Demo Ops",
      roles: ["ops"],
      activeRole: "ops",
    };
  }

  const actor = await getOptionalLiveActor();

  if (!actor) {
    return null;
  }

  const requestedRole = await getActiveRoleCookieValue();

  return {
    mode: "live",
    profileId: actor.profileId,
    email: actor.email,
    fullName: actor.fullName,
    roles: actor.roles,
    activeRole: resolveActiveRole(actor.roles, requestedRole),
  };
}

export async function requireInternalAccess(
  redirectTarget: string,
): Promise<InternalAccess> {
  if (!isSupabaseConfigured()) {
    return {
      mode: "demo",
      profileId: "demo-ops",
      email: "demo@begifted.example",
      fullName: "Demo Ops",
      roles: ["ops"],
      activeRole: "ops",
      familyScope: "all",
    };
  }

  const actor = await getRequiredLiveActor(redirectTarget);
  const internalRoles = getInternalRoles(actor.roles);
  const requestedRole = await getActiveRoleCookieValue();
  const activeRole = resolveActiveRole(actor.roles, requestedRole);

  if (!internalRoles.length || !activeRole || activeRole === "parent") {
    redirect("/portal");
  }

  return {
    mode: "live",
    profileId: actor.profileId,
    email: actor.email,
    fullName: actor.fullName,
    roles: internalRoles,
    activeRole,
    familyScope: activeRole === "ops" ? "all" : "assigned",
  };
}

export async function getPortalAccess(
  redirectTarget: string,
): Promise<PortalAccess> {
  if (!isSupabaseConfigured()) {
    return {
      mode: "demo",
      enabled: true,
    };
  }

  const actor = await getRequiredLiveActor(redirectTarget);
  const requestedRole = await getActiveRoleCookieValue();
  const activeRole = resolveActiveRole(actor.roles, requestedRole);

  if (!isParentOnlyRoleSet(actor.roles)) {
    return {
      mode: "live",
      enabled: false,
      roles: actor.roles,
      activeRole,
      profileId: actor.profileId,
      email: actor.email,
      fullName: actor.fullName,
    };
  }

  return {
    mode: "live",
    enabled: true,
    roles: actor.roles,
    activeRole,
    profileId: actor.profileId,
    email: actor.email,
    fullName: actor.fullName,
  };
}
