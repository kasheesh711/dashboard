"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/auth/config";
import {
  ACTIVE_ROLE_COOKIE_MAX_AGE,
  ACTIVE_ROLE_COOKIE_NAME,
  getInternalRoles,
  resolveActiveRole,
  type InternalRole,
} from "@/lib/auth/roles";
import { requireInternalAccess } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requestMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = String(formData.get("next") ?? "/dashboard").trim() || "/dashboard";

  if (!email) {
    redirect("/sign-in?error=missing_email");
  }

  if (!isSupabaseConfigured()) {
    redirect("/sign-in?error=demo_mode");
  }

  const headerStore = await headers();
  const origin =
    headerStore.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    redirect(`/sign-in?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/sign-in?sent=1");
}

export async function switchActiveRole(formData: FormData) {
  const requestedRole = String(formData.get("nextRole") ?? "").trim().toLowerCase();
  const actor = await requireInternalAccess("/dashboard");
  const internalRoles = getInternalRoles(actor.roles);
  const nextRole = resolveActiveRole(internalRoles, requestedRole) as InternalRole | null;
  const headerStore = await headers();
  const referer = headerStore.get("referer") ?? "/dashboard";
  const cookieStore = await cookies();

  if (!nextRole || !internalRoles.includes(nextRole)) {
    redirect(referer);
  }

  cookieStore.set(ACTIVE_ROLE_COOKIE_NAME, nextRole, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    maxAge: ACTIVE_ROLE_COOKIE_MAX_AGE,
  });

  redirect(referer);
}
