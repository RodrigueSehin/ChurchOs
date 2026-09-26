"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ADMIN_ROLES, MODULE_OPTIONS } from "@/features/onboarding/constants";
import { seedRolePermissionsForOrganization } from "@/lib/rbac/seed-role-permissions";

export interface OnboardingActionState {
  error?: string;
}

function roleLabel(value: string): string {
  return ADMIN_ROLES.find((r) => r.value === value)?.label ?? "Administrateur";
}

/**
 * Écrit via le client Supabase (JS), pas Drizzle : `DATABASE_URL` (utilisé par Drizzle) se
 * connecte avec un rôle Postgres élevé qui CONTOURNE le RLS (voir
 * docs/architecture/03-multi-tenancy-and-rls.md). Toute écriture sensible au RLS déclenchée
 * par une action utilisateur doit passer par le client Supabase (porte le JWT de la session,
 * donc `auth.uid()`/`is_org_member()` s'évaluent correctement) — Drizzle est réservé aux
 * lectures et aux contextes service-role qui ré-implémentent eux-mêmes l'autorisation.
 */
export async function finalizeOnboarding(
  _prev: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const churchName = formData.get("churchName")?.toString().trim();
  const slug = formData.get("slug")?.toString().trim();
  const denomination = formData.get("denomination")?.toString().trim() || null;
  const city = formData.get("city")?.toString().trim() || null;
  const countryCode = formData.get("countryCode")?.toString().trim() || "CI";
  const address = formData.get("address")?.toString().trim() || null;
  const churchPhone = formData.get("churchPhone")?.toString().trim() || null;
  const churchEmail = formData.get("churchEmail")?.toString().trim() || null;
  const website = formData.get("website")?.toString().trim() || null;
  const timezone = formData.get("timezone")?.toString().trim() || "Africa/Abidjan";
  const currency = formData.get("currency")?.toString().trim() || "XOF";
  const dateFormat = formData.get("dateFormat")?.toString().trim() || "dd/MM/yyyy";
  const campusCount = Math.max(1, Number(formData.get("campusCount")) || 1);
  const campusName = formData.get("campusName")?.toString().trim() || "Campus Principal";
  const adminRole = formData.get("adminRole")?.toString().trim() || "senior_pastor";
  const modules = formData.get("modules")?.toString().split(",").filter(Boolean) ?? [];
  const planCode = formData.get("planCode")?.toString() || "FREE";
  const billingInterval = formData.get("billingInterval")?.toString() === "yearly" ? "yearly" : "monthly";

  if (!churchName || !slug) {
    return { error: "Informations de l'église manquantes." };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Session expirée — reconnectez-vous pour continuer." };
  }

  const { data: organizationId, error: rpcError } = await supabase.rpc(
    "create_organization_for_current_user",
    { p_name: churchName, p_slug: slug, p_city: city, p_country_code: countryCode },
  );

  if (rpcError || !organizationId) {
    const message = rpcError?.message ?? "";
    if (message.includes("duplicate") || message.includes("unique")) {
      return { error: "Ce nom d'église (URL) est déjà utilisé par une autre organisation." };
    }
    return { error: message || "Erreur lors de la création de l'organisation." };
  }

  // Complète l'organisation avec les champs que la RPC (name/slug/city/country uniquement)
  // n'accepte pas.
  const { error: orgUpdateError } = await supabase
    .from("organizations")
    .update({
      description: denomination,
      email: churchEmail,
      phone: churchPhone,
      website,
      address_line1: address,
      timezone,
      currency,
    })
    .eq("id", organizationId);
  if (orgUpdateError) {
    return { error: `Organisation créée, mais échec de la mise à jour des détails : ${orgUpdateError.message}` };
  }

  // Titre du membership = rôle choisi à l'étape 2 (la RPC met "Administrateur" par défaut).
  await supabase
    .from("organization_memberships")
    .update({ title: roleLabel(adminRole) })
    .eq("organization_id", organizationId)
    .eq("user_id", user.id);

  // `db/schema.sql` ne seed jamais `role_permissions` (voir la fonction) — sans ça, aucun rôle
  // non-admin de cette organisation n'aurait de permission fine tant que personne n'y touche.
  const rbacSeedResult = await seedRolePermissionsForOrganization(supabase, organizationId);
  if (rbacSeedResult.error) {
    return {
      error: `Organisation créée, mais échec de l'initialisation des permissions : ${rbacSeedResult.error}`,
    };
  }

  await supabase.from("organization_settings").update({ date_format: dateFormat }).eq("organization_id", organizationId);

  const campusRows = Array.from({ length: campusCount }, (_, i) => ({
    organization_id: organizationId,
    name: i === 0 ? campusName : `Campus ${i + 1}`,
    is_main: i === 0,
  }));
  const { error: campusError } = await supabase.from("campuses").insert(campusRows);
  if (campusError) {
    return { error: `Organisation créée, mais échec de la création du campus : ${campusError.message}` };
  }

  // Modules sélectionnés → active les feature_flags correspondants (un module UI peut
  // couvrir plusieurs flags, voir MODULE_OPTIONS).
  const flagKeys = [
    ...new Set(
      MODULE_OPTIONS.filter((m) => m.alwaysOn || modules.includes(m.key)).flatMap((m) => m.flags),
    ),
  ];
  if (flagKeys.length) {
    const { data: flags } = await supabase.from("feature_flags").select("id, key").in("key", flagKeys);
    if (flags?.length) {
      await supabase.from("organization_features").insert(
        flags.map((f) => ({ organization_id: organizationId, feature_id: f.id, enabled: true })),
      );
    }
  }

  const { data: plan } = await supabase
    .from("plans")
    .select("id")
    .eq("code", planCode)
    .maybeSingle();

  if (plan) {
    await supabase.from("subscriptions").insert({
      organization_id: organizationId,
      plan_id: plan.id,
      status: "trialing",
      billing_interval: billingInterval,
    });
  }

  redirect("/onboarding/welcome");
}
