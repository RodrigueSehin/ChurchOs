import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { aiConversations, aiMessages } from "@/lib/db/schema";

/**
 * Filtre applicatif obligatoire : `ai_conversations`/`ai_messages` ne sont couverts par RLS
 * qu'au niveau organisation (voir docs/architecture/04-rbac-permissions.md). Une conversation IA
 * est personnelle — chaque requête filtre donc aussi sur `userId`, sinon n'importe quel membre de
 * l'organisation pourrait lire les questions (et réponses potentiellement sensibles) de n'importe
 * qui d'autre.
 */
export async function getConversations(organizationId: string, userId: string) {
  return db
    .select()
    .from(aiConversations)
    .where(and(eq(aiConversations.organizationId, organizationId), eq(aiConversations.userId, userId)))
    .orderBy(desc(aiConversations.updatedAt));
}

export async function getConversation(organizationId: string, userId: string, id: string) {
  const [row] = await db
    .select()
    .from(aiConversations)
    .where(
      and(
        eq(aiConversations.id, id),
        eq(aiConversations.organizationId, organizationId),
        eq(aiConversations.userId, userId),
      ),
    );
  return row ?? null;
}

export async function getConversationMessages(conversationId: string) {
  return db
    .select()
    .from(aiMessages)
    .where(eq(aiMessages.conversationId, conversationId))
    .orderBy(asc(aiMessages.createdAt));
}
