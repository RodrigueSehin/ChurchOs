"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requirePlatformAdmin } from "@/lib/auth/platform";
import { db } from "@/lib/db/client";
import { auditLogs, organizations } from "@/lib/db/schema";

export interface PlatformActionState {
  error?: string;
  success?: boolean;
}

const setStatusSchema = z.object({
  organizationId: z.string().uuid(),
  status: z.enum(["active", "suspended"]),
});

/** Suspend ou réactive une église. Trace systématiquement l'action dans `audit_logs`
 * (toute action transversale de la plateforme doit être auditée). */
export async function setOrganizationStatus(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const admin = await requirePlatformAdmin();

  const parsed = setStatusSchema.safeParse({
    organizationId: formData.get("organizationId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { error: "Requête invalide" };
  const { organizationId, status: requested } = parsed.data;

  const [current] = await db
    .select({ status: organizations.status })
    .from(organizations)
    .where(eq(organizations.id, organizationId));
  if (!current) return { error: "Église introuvable" };
  if (current.status === "archived") return { error: "Une église archivée ne peut être ni suspendue ni réactivée ici." };

  let status: "trial" | "active" | "suspended";
  if (requested === "suspended") {
    if (current.status === "suspended") return { success: true };
    status = "suspended";
  } else {
    if (current.status !== "suspended") return { success: true };
    // Réactivation : on restaure l'état d'avant la suspension (un essai reste un essai) plutôt
    // que de forcer « active ». Sans trace de suspension exploitable, repli sur « active ».
    const [lastSuspension] = await db
      .select({ metadata: auditLogs.metadata })
      .from(auditLogs)
      .where(and(eq(auditLogs.organizationId, organizationId), eq(auditLogs.action, "platform.organization.suspended")))
      .orderBy(desc(auditLogs.createdAt))
      .limit(1);
    const before = (lastSuspension?.metadata as { from?: string } | undefined)?.from;
    status = before === "trial" ? "trial" : "active";
  }

  await db.transaction(async (tx) => {
    await tx
      .update(organizations)
      .set({ status, updatedAt: new Date() })
      .where(eq(organizations.id, organizationId));
    await tx.insert(auditLogs).values({
      organizationId,
      userId: admin.id,
      action: status === "suspended" ? "platform.organization.suspended" : "platform.organization.reactivated",
      entityType: "organization",
      entityId: organizationId,
      metadata: { from: current.status, to: status },
    });
  });

  revalidatePath("/platform", "layout");
  return { success: true };
}
