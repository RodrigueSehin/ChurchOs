"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { checkPermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export interface RoleActionState {
  error?: string;
  success?: boolean;
}

function slugifyCode(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/(^_|_$)/g, "");
}

const createRoleSchema = z.object({
  name: z.string().min(2, "Nom requis"),
  description: z.string().optional().default(""),
});

export async function createRole(_prev: RoleActionState, formData: FormData): Promise<RoleActionState> {
  const check = await checkPermission("settings.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de gérer les rôles." };

  const parsed = createRoleSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };

  const organizationId = check.organization.organization.id;
  const baseCode = slugifyCode(parsed.data.name) || "ROLE";

  const supabase = await createClient();

  // Code unique par organisation (contrainte `roles_org_code_unique`) — on ajoute un suffixe
  // numérique en cas de collision plutôt que de faire échouer la création pour un détail interne
  // que l'utilisateur ne choisit pas lui-même.
  let code = baseCode;
  for (let attempt = 0; attempt < 20; attempt++) {
    const { data: existing } = await supabase
      .from("roles")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("code", code)
      .maybeSingle();
    if (!existing) break;
    code = `${baseCode}_${attempt + 2}`;
  }

  const { error } = await supabase.from("roles").insert({
    organization_id: organizationId,
    code,
    name: parsed.data.name,
    description: parsed.data.description.trim() || null,
    is_system: false,
  });
  if (error) return { error: error.message };

  revalidatePath("/settings/roles");
  return { success: true };
}

export async function deleteRole(roleId: string): Promise<RoleActionState> {
  const check = await checkPermission("settings.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de gérer les rôles." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("roles")
    .delete()
    .eq("id", roleId)
    .eq("organization_id", check.organization.organization.id)
    .eq("is_system", false);
  if (error) return { error: error.message };

  revalidatePath("/settings/roles");
  return { success: true };
}

export async function toggleRolePermission(
  roleId: string,
  permissionId: string,
  enabled: boolean,
): Promise<RoleActionState> {
  const check = await checkPermission("settings.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de gérer les permissions." };

  const supabase = await createClient();

  if (enabled) {
    const { error } = await supabase
      .from("role_permissions")
      .upsert({ role_id: roleId, permission_id: permissionId }, { onConflict: "role_id,permission_id", ignoreDuplicates: true });
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("role_permissions")
      .delete()
      .eq("role_id", roleId)
      .eq("permission_id", permissionId);
    if (error) return { error: error.message };
  }

  revalidatePath("/settings/roles");
  return { success: true };
}
