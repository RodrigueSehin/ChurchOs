import { NextResponse } from "next/server";
import { and, isNotNull, isNull, lte } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { messages } from "@/lib/db/schema";
import { dispatchMessage } from "@/features/communication/services/dispatch";

/**
 * Envoie les messages SMS/email planifiés dont l'heure est passée. À appeler régulièrement (par ex.
 * toutes les 5 minutes via Vercel Cron ou tout planificateur) avec `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const due = await db
    .select({ id: messages.id, organizationId: messages.organizationId })
    .from(messages)
    .where(and(isNull(messages.sentAt), isNotNull(messages.scheduledAt), lte(messages.scheduledAt, new Date())))
    .limit(50);

  const results = [];
  for (const m of due) {
    results.push({ id: m.id, ...(await dispatchMessage(m.id, m.organizationId)) });
  }
  return NextResponse.json({ processed: results.length, results });
}
