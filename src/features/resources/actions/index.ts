"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne, sql } from "drizzle-orm";

import { checkPermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { people, resourceReservations, resources } from "@/lib/db/schema";
import {
  DOC_MIME_EXTENSIONS,
  MAX_DOCUMENTS,
  MAX_PHOTOS,
  PHOTO_MIME_EXTENSIONS,
  RESOURCE_DOC_BUCKET,
  RESOURCE_FILE_MAX_BYTES,
  RESOURCE_PHOTO_BUCKET,
  equipmentSchema,
  reservationSchema,
  resourcePhotoPath,
  roomSchema,
  type ResourceDocument,
} from "@/features/resources/schemas";

export interface ResourceActionState {
  error?: string;
  success?: boolean;
}

function orNull(value: string) {
  return value.trim() === "" ? null : value.trim();
}

export interface UploadedFileRef {
  path: string;
  mime: string;
  size: number;
  name?: string;
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Chemins de fichiers déjà envoyés du navigateur vers Storage : préfixe de l'organisation, type et taille revérifiés. */
function validateUploads(organizationId: string, files: UploadedFileRef[], mimes: Record<string, string>, label: string) {
  for (const f of files) {
    if (!f.path.startsWith(`${organizationId}/`) || f.path.includes("..")) return "Chemin de fichier invalide.";
    if (!mimes[f.mime] || !(f.size > 0) || f.size > RESOURCE_FILE_MAX_BYTES) return `${label} : format ou taille invalide (5 Mo maximum).`;
  }
  return null;
}

async function removeFiles(supabase: Supabase, bucket: string, paths: (string | null)[]) {
  const list = paths.filter((p): p is string => Boolean(p));
  if (list.length) await supabase.storage.from(bucket).remove(list);
}

function personOrNull(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : null;
}

/** Crée ou modifie une salle (formulaire « Nouvelle salle »). Photos : déjà envoyées directement vers Storage. */
export async function saveRoom(input: {
  id?: string;
  fields: Record<string, unknown>;
  newPhotos?: UploadedFileRef[];
  removedPhotos?: string[];
}): Promise<ResourceActionState & { id?: string }> {
  const check = await checkPermission("resources.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de gérer les salles." };
  const organizationId = check.organization.organization.id;
  const supabase = await createClient();
  const newPhotos = input.newPhotos ?? [];
  const fail = async (error: string) => {
    await removeFiles(supabase, RESOURCE_PHOTO_BUCKET, newPhotos.filter((f) => f.path.startsWith(`${organizationId}/`) && !f.path.includes("..")).map((f) => f.path));
    return { error };
  };

  const parsed = roomSchema.safeParse(input.fields);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Formulaire invalide");
  const v = parsed.data;
  const uploadError = validateUploads(organizationId, newPhotos, PHOTO_MIME_EXTENSIONS, "Photo");
  if (uploadError) return fail(uploadError);

  let existingPhotos: string[] = [];
  if (input.id) {
    const [current] = await db.select({ photos: resources.photos }).from(resources).where(and(eq(resources.id, input.id), eq(resources.organizationId, organizationId), eq(resources.type, "room")));
    if (!current) return fail("Salle introuvable.");
    existingPhotos = current.photos;
  }
  const removed = new Set((input.removedPhotos ?? []).filter((u) => existingPhotos.includes(u)));
  const added = newPhotos.map((f) => supabase.storage.from(RESOURCE_PHOTO_BUCKET).getPublicUrl(f.path).data.publicUrl);
  const photos = [...existingPhotos.filter((u) => !removed.has(u)), ...added];
  if (photos.length > MAX_PHOTOS) return fail(`${MAX_PHOTOS} photos maximum.`);

  const values = {
    name: v.name,
    type: "room" as const,
    description: orNull(v.description),
    location: v.location,
    status: v.mode === "draft" ? "draft" : v.status,
    capacity: v.capacity,
    roomType: v.roomType,
    amenities: v.amenities,
    reservableBy: v.reservableBy,
    allowReservations: v.allowReservations,
    requiresApproval: v.requiresApproval,
    publicCalendar: v.publicCalendar,
    internalNotes: orNull(v.internalNotes),
    photos,
    updatedAt: new Date(),
  };

  let id = input.id;
  try {
    if (id) {
      await db.update(resources).set(values).where(and(eq(resources.id, id), eq(resources.organizationId, organizationId)));
    } else {
      const [row] = await db.insert(resources).values({ ...values, organizationId, quantity: 1 }).returning({ id: resources.id });
      id = row?.id;
    }
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Échec de l'enregistrement.");
  }

  await removeFiles(supabase, RESOURCE_PHOTO_BUCKET, [...removed].map(resourcePhotoPath));
  revalidatePath("/resources");
  return { success: true, id };
}

/** Crée ou modifie un équipement (formulaire « Nouvel équipement »). Photo et documents : envoi direct vers Storage. */
export async function saveEquipment(input: {
  id?: string;
  fields: Record<string, unknown>;
  newPhotos?: UploadedFileRef[];
  removedPhotos?: string[];
  newDocuments?: (UploadedFileRef & { name: string })[];
  removedDocuments?: string[];
}): Promise<ResourceActionState & { id?: string }> {
  const check = await checkPermission("resources.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de gérer les équipements." };
  const organizationId = check.organization.organization.id;
  const supabase = await createClient();
  const newPhotos = input.newPhotos ?? [];
  const newDocuments = input.newDocuments ?? [];
  const safe = (f: UploadedFileRef) => f.path.startsWith(`${organizationId}/`) && !f.path.includes("..");
  const fail = async (error: string) => {
    await removeFiles(supabase, RESOURCE_PHOTO_BUCKET, newPhotos.filter(safe).map((f) => f.path));
    await removeFiles(supabase, RESOURCE_DOC_BUCKET, newDocuments.filter(safe).map((f) => f.path));
    return { error };
  };

  const parsed = equipmentSchema.safeParse(input.fields);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Formulaire invalide");
  const v = parsed.data;
  const uploadError = validateUploads(organizationId, newPhotos, PHOTO_MIME_EXTENSIONS, "Photo") ?? validateUploads(organizationId, newDocuments, DOC_MIME_EXTENSIONS, "Document");
  if (uploadError) return fail(uploadError);

  let purchaseValue: number | null = null;
  if (v.purchaseValue) {
    purchaseValue = Number(v.purchaseValue.replace(/[\s\u00a0]/g, "").replace(",", "."));
    if (!Number.isFinite(purchaseValue) || purchaseValue < 0 || purchaseValue > 1e12) return fail("Valeur d'achat invalide.");
    purchaseValue = Math.round(purchaseValue);
  }

  let roomId: string | null = null;
  if (v.roomId) {
    const [room] = await db.select({ id: resources.id }).from(resources).where(and(eq(resources.id, v.roomId), eq(resources.organizationId, organizationId), eq(resources.type, "room")));
    if (!room) return fail("Salle introuvable.");
    roomId = room.id;
  }
  let responsiblePersonId: string | null = null;
  if (v.responsiblePersonId) {
    const personId = personOrNull(v.responsiblePersonId);
    const [person] = personId ? await db.select({ id: people.id }).from(people).where(and(eq(people.id, personId), eq(people.organizationId, organizationId))) : [];
    if (!person) return fail("Responsable introuvable.");
    responsiblePersonId = person.id;
  }

  let existingPhotos: string[] = [];
  let existingDocs: ResourceDocument[] = [];
  if (input.id) {
    const [current] = await db.select({ photos: resources.photos, documents: resources.documents }).from(resources).where(and(eq(resources.id, input.id), eq(resources.organizationId, organizationId), ne(resources.type, "room")));
    if (!current) return fail("Équipement introuvable.");
    existingPhotos = current.photos;
    existingDocs = current.documents;
  }
  const removedPhotos = new Set((input.removedPhotos ?? []).filter((u) => existingPhotos.includes(u)));
  const removedDocs = new Set((input.removedDocuments ?? []).filter((p) => existingDocs.some((d) => d.path === p)));
  const photos = [...existingPhotos.filter((u) => !removedPhotos.has(u)), ...newPhotos.map((f) => supabase.storage.from(RESOURCE_PHOTO_BUCKET).getPublicUrl(f.path).data.publicUrl)];
  const documents: ResourceDocument[] = [...existingDocs.filter((d) => !removedDocs.has(d.path)), ...newDocuments.map((f) => ({ path: f.path, name: f.name.slice(0, 200), mime: f.mime, size: f.size }))];
  if (photos.length > MAX_PHOTOS) return fail(`${MAX_PHOTOS} photos maximum.`);
  if (documents.length > MAX_DOCUMENTS) return fail(`${MAX_DOCUMENTS} documents maximum.`);

  const values = {
    name: v.name,
    category: v.category,
    quantity: v.quantity,
    description: orNull(v.description),
    brand: orNull(v.brand),
    model: orNull(v.model),
    serialNumber: orNull(v.serialNumber),
    condition: v.condition,
    purchaseDate: orNull(v.purchaseDate),
    purchaseValue,
    roomId,
    responsiblePersonId,
    warrantyEnd: orNull(v.warrantyEnd),
    supplier: orNull(v.supplier),
    invoiceReference: orNull(v.invoiceReference),
    status: v.mode === "draft" ? "draft" : "available",
    photos,
    documents,
    updatedAt: new Date(),
  };

  let id = input.id;
  try {
    if (id) {
      await db.update(resources).set(values).where(and(eq(resources.id, id), eq(resources.organizationId, organizationId)));
    } else {
      const [row] = await db.insert(resources).values({ ...values, organizationId, type: "equipment" }).returning({ id: resources.id });
      id = row?.id;
    }
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Échec de l'enregistrement.");
  }

  await removeFiles(supabase, RESOURCE_PHOTO_BUCKET, [...removedPhotos].map(resourcePhotoPath));
  await removeFiles(supabase, RESOURCE_DOC_BUCKET, [...removedDocs]);
  revalidatePath("/resources");
  return { success: true, id };
}

/** Lien temporaire (1 h) vers un document d'équipement (bucket privé). */
export async function getResourceDocumentUrl(resourceId: string, path: string): Promise<{ url?: string; error?: string }> {
  const check = await checkPermission("resources.view");
  if (!check.allowed) return { error: "Permission refusée." };
  const [row] = await db.select({ documents: resources.documents }).from(resources).where(and(eq(resources.id, resourceId), eq(resources.organizationId, check.organization.organization.id)));
  if (!row?.documents.some((d) => d.path === path)) return { error: "Document introuvable." };
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(RESOURCE_DOC_BUCKET).createSignedUrl(path, 3600);
  if (error || !data) return { error: error?.message ?? "Lien indisponible." };
  return { url: data.signedUrl };
}

/** Réservé aux admins (policy RLS de suppression : `is_org_admin()`). Les réservations sont supprimées en cascade ; photos et documents sont retirés de Storage. */
export async function deleteResource(resourceId: string): Promise<ResourceActionState> {
  const check = await checkPermission("resources.manage");
  if (!check.allowed || !check.context.isAdmin) {
    return { error: "Seul un administrateur de l'organisation peut supprimer une ressource." };
  }

  const organizationId = check.organization.organization.id;
  const [row] = await db.select({ photos: resources.photos, documents: resources.documents }).from(resources).where(and(eq(resources.id, resourceId), eq(resources.organizationId, organizationId)));
  const supabase = await createClient();
  const { error } = await supabase.from("resources").delete().eq("id", resourceId).eq("organization_id", organizationId);
  if (error) return { error: error.message };
  if (row) {
    await removeFiles(supabase, RESOURCE_PHOTO_BUCKET, row.photos.map(resourcePhotoPath));
    await removeFiles(supabase, RESOURCE_DOC_BUCKET, row.documents.map((d) => d.path));
  }

  revalidatePath("/resources");
  return { success: true };
}

export async function createReservation(
  resourceId: string,
  _prev: ResourceActionState,
  formData: FormData,
): Promise<ResourceActionState> {
  const check = await checkPermission("resources.reserve");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de réserver une ressource." };

  const parsed = reservationSchema.safeParse({
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    purpose: formData.get("purpose"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  if (new Date(v.endsAt) <= new Date(v.startsAt)) {
    return { error: "La date de fin doit être après la date de début." };
  }

  const organizationId = check.organization.organization.id;
  const [resource] = await db
    .select()
    .from(resources)
    .where(and(eq(resources.id, resourceId), eq(resources.organizationId, organizationId)));
  if (!resource) return { error: "Ressource introuvable." };
  if (resource.status === "draft") return { error: "Cette ressource n'est pas encore en service (brouillon)." };
  if (resource.status === "maintenance") return { error: "Cette ressource est actuellement en maintenance." };
  if (resource.status === "retired") return { error: "Cette ressource a été retirée du service." };

  if (!resource.allowReservations) return { error: "Les réservations sont désactivées pour cette ressource." };
  const isManager = check.context.isAdmin || check.context.permissions.has("resources.manage");
  if (resource.reservableBy === "admins" && !check.context.isAdmin) return { error: "Cette ressource n'est réservable que par les administrateurs." };
  if (resource.reservableBy === "leaders" && !isManager) return { error: "Cette ressource n'est réservable que par les responsables." };

  // Conflit tenant compte de la quantité : une ressource avec `quantity > 1` (ex. 10 micros)
  // autorise autant de réservations qui se chevauchent que d'unités disponibles — contrairement à
  // la détection de conflits de planning (Phase 7), binaire, qui ne s'applique qu'à un ouvrier
  // (toujours "quantité 1").
  const overlapping = await db
    .select({ id: resourceReservations.id })
    .from(resourceReservations)
    .where(
      and(
        eq(resourceReservations.organizationId, organizationId),
        eq(resourceReservations.resourceId, resourceId),
        ne(resourceReservations.status, "cancelled"),
        sql`${resourceReservations.startsAt} < ${v.endsAt} and ${resourceReservations.endsAt} > ${v.startsAt}`,
      ),
    );
  if (overlapping.length >= resource.quantity) {
    return {
      error: `Aucune unité disponible sur ce créneau (${overlapping.length}/${resource.quantity} déjà réservée(s)).`,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("resource_reservations").insert({
    organization_id: organizationId,
    resource_id: resourceId,
    reserved_by_user_id: check.user.id,
    starts_at: v.startsAt,
    ends_at: v.endsAt,
    purpose: orNull(v.purpose),
    // Une ressource « sans validation requise » est confirmée d'emblée.
    status: resource.requiresApproval ? "pending" : "confirmed",
  });
  if (error) return { error: error.message };

  revalidatePath("/resources");
  return { success: true };
}

/** Le changement de statut est autorisé au gestionnaire (`resources.manage`/admin) ou au
 * demandeur lui-même sur sa propre réservation (ex. l'annuler) — jamais sur celle d'un tiers. */
export async function updateReservationStatus(reservationId: string, status: string): Promise<ResourceActionState> {
  const check = await checkPermission("resources.reserve");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de modifier cette réservation." };

  const organizationId = check.organization.organization.id;
  const [reservation] = await db
    .select()
    .from(resourceReservations)
    .where(and(eq(resourceReservations.id, reservationId), eq(resourceReservations.organizationId, organizationId)));
  if (!reservation) return { error: "Réservation introuvable." };

  const canManageAny = check.context.isAdmin || check.context.permissions.has("resources.manage");
  const isOwner = reservation.reservedByUserId === check.user.id;
  if (!canManageAny && !isOwner) {
    return { error: "Vous ne pouvez modifier que vos propres réservations." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("resource_reservations")
    .update({ status })
    .eq("id", reservationId)
    .eq("organization_id", organizationId);
  if (error) return { error: error.message };

  revalidatePath("/resources");
  return { success: true };
}
