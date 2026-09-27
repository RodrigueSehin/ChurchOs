import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Route Handler (pas une Server Action) : point d'entrée du scan QR — voir
 * `01-project-structure.md`. Appelé sans session (l'appareil qui scanne n'est pas forcément
 * connecté à ChurchOS) : la seule autorisation est la connaissance du `qr_token`, unguessable
 * (généré via `crypto.randomBytes`, voir `lib/qr/generate.ts`) — pattern standard pour un
 * check-in par billet. C'est pourquoi le client admin est utilisé ici (RLS exigerait
 * `is_org_member()`, qu'un scan anonyme ne peut jamais satisfaire) — restriction documentée dans
 * `lib/supabase/admin.ts` : autorisé dans un Route Handler, jamais dans une Server Action.
 */

function page(title: string, message: string, ok: boolean) {
  return new NextResponse(
    `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title} — ChurchOS</title>
<style>
  body { font-family: system-ui, sans-serif; background: #0f172a; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; text-align: center; }
  .card { background: #1e293b; border-radius: 16px; padding: 32px 24px; max-width: 380px; }
  .icon { font-size: 48px; margin-bottom: 12px; }
  h1 { font-size: 20px; margin: 0 0 8px; }
  p { color: #94a3b8; font-size: 14px; line-height: 1.5; margin: 0; }
</style>
</head>
<body>
  <div class="card">
    <div class="icon">${ok ? "✅" : "⚠️"}</div>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`,
    { status: ok ? 200 : 404, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: registration, error } = await admin
    .from("event_registrations")
    .select("id, organization_id, event_id, person_id, guest_name, status")
    .eq("qr_token", token)
    .maybeSingle();
  if (error || !registration) {
    return page("QR code invalide", "Ce code n'est pas reconnu. Vérifiez votre lien d'inscription.", false);
  }
  if (registration.status === "cancelled") {
    return page("Inscription annulée", "Cette inscription a été annulée et ne peut plus être utilisée pour l'entrée.", false);
  }

  const { data: event } = await admin
    .from("events")
    .select("id, title, campus_id, starts_at, ends_at")
    .eq("id", registration.event_id)
    .single();
  if (!event) {
    return page("Événement introuvable", "L'événement associé à cette inscription n'existe plus.", false);
  }

  let attendeeName = registration.guest_name ?? "Invité";
  let alreadyCheckedIn = false;

  if (registration.person_id) {
    const { data: person } = await admin
      .from("people")
      .select("first_name, last_name")
      .eq("id", registration.person_id)
      .single();
    if (person) attendeeName = `${person.first_name} ${person.last_name}`;

    let { data: session } = await admin
      .from("attendance_sessions")
      .select("id")
      .eq("event_id", event.id)
      .maybeSingle();
    if (!session) {
      const { data: created, error: createError } = await admin
        .from("attendance_sessions")
        .insert({
          organization_id: registration.organization_id,
          campus_id: event.campus_id,
          event_id: event.id,
          title: event.title,
          starts_at: event.starts_at,
          ends_at: event.ends_at,
        })
        .select("id")
        .single();
      if (createError) return page("Erreur", "Impossible d'enregistrer la présence pour le moment.", false);
      session = created;
    }

    const { data: existingRecord } = await admin
      .from("attendance_records")
      .select("id")
      .eq("session_id", session.id)
      .eq("person_id", registration.person_id)
      .maybeSingle();
    alreadyCheckedIn = Boolean(existingRecord);

    const { error: upsertError } = await admin.from("attendance_records").upsert(
      {
        organization_id: registration.organization_id,
        session_id: session.id,
        person_id: registration.person_id,
        status: "present",
        checked_in_at: new Date().toISOString(),
        method: "qr",
      },
      { onConflict: "session_id,person_id" },
    );
    if (upsertError) return page("Erreur", "Impossible d'enregistrer la présence pour le moment.", false);
  }

  if (registration.status !== "attended") {
    await admin.from("event_registrations").update({ status: "attended" }).eq("id", registration.id);
  } else {
    alreadyCheckedIn = true;
  }

  return page(
    alreadyCheckedIn ? "Déjà enregistré" : "Présence enregistrée",
    `Bienvenue${alreadyCheckedIn ? " à nouveau" : ""}, ${attendeeName} ! ${alreadyCheckedIn ? "Votre présence était déjà enregistrée pour" : "Votre présence est enregistrée pour"} « ${event.title} ».`,
    true,
  );
}
