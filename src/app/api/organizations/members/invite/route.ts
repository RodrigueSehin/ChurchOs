import { NextResponse } from "next/server";
import { z } from "zod";

import { checkPermission } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Route Handler (pas une Server Action) : c'est le seul endroit autorisé à utiliser le client
 * admin Supabase pour une opération déclenchée par un formulaire utilisateur — voir la
 * restriction documentée dans `lib/supabase/admin.ts`.
 */
const inviteSchema = z.object({
  email: z.string().email(),
  roleCode: z.string().min(1),
  title: z.string().optional().default(""),
});

export async function POST(request: Request) {
  const check = await checkPermission("settings.manage");
  if (!check.allowed) {
    return NextResponse.json({ error: "Vous n'avez pas la permission d'inviter des membres." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Formulaire invalide" }, { status: 400 });
  }
  const { email, roleCode, title } = parsed.data;
  const organizationId = check.organization.organization.id;

  const admin = createAdminClient();
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/reset-password/update`,
  });

  let userId = invited?.user?.id;
  if (inviteError && !userId) {
    const alreadyRegistered = /already.*(registered|exists)/i.test(inviteError.message);
    if (!alreadyRegistered) {
      return NextResponse.json({ error: inviteError.message }, { status: 400 });
    }
    // Compte déjà existant ailleurs sur ChurchOS : on l'ajoute directement à cette organisation
    // plutôt que d'échouer — l'API admin n'a pas de "getUserByEmail" direct, on paginate.
    for (let page = 1; !userId; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      userId = data.users.find((u) => u.email === email)?.id;
      if (!userId && data.users.length < 200) break;
    }
  }
  if (!userId) {
    return NextResponse.json({ error: "Impossible de créer ou retrouver ce compte." }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: membership, error: membershipError } = await supabase
    .from("organization_memberships")
    .upsert(
      {
        organization_id: organizationId,
        user_id: userId,
        title: title.trim() || null,
        // Simplification volontaire : le membre a accès dès l'envoi de l'invitation (l'admin qui
        // invite fait foi), pas d'état "en attente d'acceptation" distinct à suivre côté app.
        status: "active",
        joined_at: new Date().toISOString(),
        invited_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,user_id" },
    )
    .select("id")
    .single();
  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 400 });
  }

  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("code", roleCode)
    .maybeSingle();
  if (roleError) return NextResponse.json({ error: roleError.message }, { status: 400 });

  if (role) {
    const { error: roleAssignError } = await supabase
      .from("membership_roles")
      .upsert(
        { membership_id: membership.id, role_id: role.id },
        { onConflict: "membership_id,role_id", ignoreDuplicates: true },
      );
    if (roleAssignError) return NextResponse.json({ error: roleAssignError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
