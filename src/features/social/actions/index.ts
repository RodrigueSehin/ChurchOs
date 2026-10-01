"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { checkPermission } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { socialConnections } from "@/lib/db/schema";
import { encryptToken, isSocialCryptoConfigured } from "@/lib/social/crypto";
import { verifyConnection } from "@/lib/social/graph";

export interface SocialActionState {
  error?: string;
  success?: boolean;
}

const connectSchema = z.object({
  provider: z.enum(["facebook", "instagram"], { message: "Réseau requis" }),
  externalId: z.string().trim().min(1, "Identifiant requis").regex(/^\d+$/, "L'identifiant est numérique (ID de la Page ou du compte Instagram Business)."),
  token: z.string().trim().min(20, "Jeton d'accès requis"),
});

/** Connecte un compte : le couple identifiant / jeton est VÉRIFIÉ auprès de Meta (le nom du compte en
 * est tiré), puis le jeton est chiffré avant stockage. Réservé à l'administrateur / propriétaire. */
export async function connectSocialAccount(_prev: SocialActionState, formData: FormData): Promise<SocialActionState> {
  const check = await checkPermission("settings.manage");
  if (!check.allowed || !check.context.isAdmin) {
    return { error: "Seul l'administrateur ou le propriétaire de l'église peut connecter un réseau social." };
  }
  if (!isSocialCryptoConfigured()) {
    return { error: "SOCIAL_TOKEN_KEY n'est pas configurée sur le serveur : les jetons ne peuvent pas être stockés en toute sécurité." };
  }

  const parsed = connectSchema.safeParse({
    provider: formData.get("provider"),
    externalId: formData.get("externalId"),
    token: formData.get("token"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  let label: string;
  try {
    label = await verifyConnection(v.provider, v.externalId, v.token);
  } catch (err) {
    return { error: `Connexion refusée par Meta : ${err instanceof Error ? err.message : "erreur inconnue"}` };
  }

  try {
    await db.insert(socialConnections).values({
      organizationId: check.organization.organization.id,
      provider: v.provider,
      label,
      externalId: v.externalId,
      tokenEncrypted: encryptToken(v.token),
      createdBy: check.user.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("duplicate") || message.includes("unique")) return { error: "Ce compte est déjà connecté." };
    return { error: "Échec de l'enregistrement du compte." };
  }

  revalidatePath("/settings/social");
  return { success: true };
}

export async function disconnectSocialAccount(connectionId: string): Promise<SocialActionState> {
  const check = await checkPermission("settings.manage");
  if (!check.allowed || !check.context.isAdmin) {
    return { error: "Seul l'administrateur ou le propriétaire de l'église peut déconnecter un compte." };
  }
  await db
    .delete(socialConnections)
    .where(and(eq(socialConnections.id, connectionId), eq(socialConnections.organizationId, check.organization.organization.id)));
  revalidatePath("/settings/social");
  return { success: true };
}
