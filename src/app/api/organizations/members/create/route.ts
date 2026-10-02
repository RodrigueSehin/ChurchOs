import { NextResponse } from "next/server";
import { z } from "zod";

import { checkPermission } from "@/lib/auth/guards";
import { generateTempPassword } from "@/lib/auth/password";
import { EMAIL_FROM, getResendClient } from "@/lib/email/resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Route Handler (pas une Server Action) : c'est le seul endroit autorisé à utiliser le client
 * admin Supabase pour une opération déclenchée par un formulaire utilisateur — voir la
 * restriction documentée dans `lib/supabase/admin.ts`.
 *
 * Création d'un utilisateur par un administrateur : un mot de passe aléatoire est généré, le compte est
 * créé (email confirmé) et rattaché à l'église avec son rôle. Le mot de passe n'est renvoyé qu'UNE fois à
 * l'administrateur (et envoyé par email si Resend est configuré) ; il n'est jamais stocké en clair. Le
 * nouvel utilisateur devra le changer à sa première connexion (`must_change_password`).
 */
const createSchema = z.object({
  firstName: z.string().trim().min(1, "Prénom requis").max(100),
  lastName: z.string().trim().min(1, "Nom requis").max(100),
  email: z.string().trim().toLowerCase().email("Email invalide"),
  roleCode: z.string().min(1, "Rôle requis"),
  title: z.string().optional().default(""),
});

async function findUserIdByEmail(admin: ReturnType<typeof createAdminClient>, email: string) {
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const found = data.users.find((u) => u.email?.toLowerCase() === email);
    if (found) return found.id;
    if (data.users.length < 200) return null;
  }
}

export async function POST(request: Request) {
  const check = await checkPermission("settings.manage");
  if (!check.allowed) {
    return NextResponse.json({ error: "Vous n'avez pas la permission de créer des utilisateurs." }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Formulaire invalide" }, { status: 400 });
  }
  const { firstName, lastName, email, roleCode, title } = parsed.data;
  const organization = check.organization.organization;

  const supabase = await createClient();
  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("id")
    .eq("organization_id", organization.id)
    .eq("code", roleCode)
    .maybeSingle();
  if (roleError) return NextResponse.json({ error: roleError.message }, { status: 400 });
  if (!role) return NextResponse.json({ error: "Rôle introuvable." }, { status: 400 });

  const admin = createAdminClient();
  const password = generateTempPassword();
  let userId: string | null = null;
  let createdNow = false;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      display_name: `${firstName} ${lastName}`,
      must_change_password: true,
    },
  });
  if (created?.user) {
    userId = created.user.id;
    createdNow = true;
  } else if (createError && /already.*(registered|exists)/i.test(createError.message)) {
    // Compte déjà existant (autre église ChurchOS) : on le rattache à cette église SANS toucher à son mot de passe.
    try {
      userId = await findUserIdByEmail(admin, email);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur Supabase" }, { status: 400 });
    }
  } else if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }
  if (!userId) return NextResponse.json({ error: "Impossible de créer ou retrouver ce compte." }, { status: 400 });

  const now = new Date().toISOString();
  const { data: membership, error: membershipError } = await supabase
    .from("organization_memberships")
    .upsert(
      { organization_id: organization.id, user_id: userId, title: title.trim() || null, status: "active", joined_at: now, invited_at: now },
      { onConflict: "organization_id,user_id" },
    )
    .select("id")
    .single();
  if (membershipError || !membership) {
    // Ne laisse pas de compte orphelin créé à l'instant.
    if (createdNow) await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: membershipError?.message ?? "Échec du rattachement à l'église." }, { status: 400 });
  }

  const { error: roleAssignError } = await supabase
    .from("membership_roles")
    .upsert({ membership_id: membership.id, role_id: role.id }, { onConflict: "membership_id,role_id", ignoreDuplicates: true });
  if (roleAssignError) {
    if (createdNow) await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: roleAssignError.message }, { status: 400 });
  }

  const loginUrl = `${process.env.APP_URL ?? ""}/login`;
  let emailSent = false;
  if (createdNow && process.env.RESEND_API_KEY) {
    try {
      const { error } = await getResendClient().emails.send({
        from: EMAIL_FROM,
        to: email,
        subject: `Votre accès à ${organization.name} sur ChurchOS`,
        html: `<div style="font-family:sans-serif;line-height:1.5">
          <p>Bonjour ${firstName.replace(/[<>&]/g, "")},</p>
          <p>Un compte ChurchOS a été créé pour vous à <strong>${organization.name.replace(/[<>&]/g, "")}</strong>.</p>
          <p>Identifiant : <strong>${email}</strong><br/>Mot de passe temporaire : <strong style="font-family:monospace">${password}</strong></p>
          <p><a href="${loginUrl}">Se connecter</a> — il vous sera demandé de choisir un nouveau mot de passe à votre première connexion.</p></div>`,
      });
      emailSent = !error;
    } catch {
      emailSent = false;
    }
  }

  return NextResponse.json(
    { success: true, email, existing: !createdNow, password: createdNow ? password : null, emailSent, loginUrl, organizationName: organization.name },
    { headers: { "Cache-Control": "no-store" } },
  );
}
