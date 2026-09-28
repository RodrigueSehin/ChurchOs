"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type OpenAI from "openai";

import { requireOrganization, requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getOpenAIClient, AI_MODEL } from "@/lib/ai/openai";
import { executeTool, getToolSpecs } from "@/lib/ai/tools";
import { getConversation, getConversationMessages } from "@/features/ai/queries";

export interface AiActionState {
  error?: string;
}

const SYSTEM_PROMPT = `Tu es l'assistant ChurchOS AI, intégré à un logiciel de gestion d'église.
Tu réponds uniquement en français, de façon concise et factuelle.
Tu n'as accès aux données de l'église QUE via les outils qui te sont fournis — tu n'inventes
jamais de chiffres ni de faits. Si un outil renvoie une erreur "permission_denied", explique
poliment à l'utilisateur qu'il n'a pas la permission nécessaire pour cette information, sans
donner aucune autre information à la place. Si aucun outil ne permet de répondre à la question,
dis-le clairement plutôt que de deviner.`;

const MAX_TOOL_ROUNDS = 4;

/** Cree une conversation vide puis redirige vers sa page — le titre sera derive du premier
 * message envoye. */
export async function createConversation(): Promise<void> {
  const user = await requireUser();
  const organization = await requireOrganization(user.id);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({ organization_id: organization.organization.id, user_id: user.id, model: AI_MODEL })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  redirect(`/ai/${data.id}`);
}

function toOpenAiMessages(
  rows: Awaited<ReturnType<typeof getConversationMessages>>,
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  return rows.map((row) => {
    if (row.role === "assistant") {
      const meta = row.metadata as { tool_calls?: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[] };
      return {
        role: "assistant",
        content: row.content || null,
        ...(meta.tool_calls ? { tool_calls: meta.tool_calls } : {}),
      } as OpenAI.Chat.Completions.ChatCompletionMessageParam;
    }
    if (row.role === "tool") {
      const meta = row.metadata as { tool_call_id: string };
      return { role: "tool", content: row.content, tool_call_id: meta.tool_call_id };
    }
    return { role: row.role as "system" | "user", content: row.content };
  });
}

/**
 * Boucle de tool-calling OpenAI (critère de sortie de cette phase) — aucun streaming, réponse
 * synchrone : cohérent avec le reste de l'app (confirmation synchrone plutôt qu'asynchrone, voir
 * la note sur Resend/Stripe dans 07-sprint-plan.md). Chaque outil que le modèle appelle repasse
 * par `checkPermission()` dans `lib/ai/tools.ts` — jamais de contournement possible ici.
 */
export async function sendMessage(conversationId: string, _prev: AiActionState, formData: FormData): Promise<AiActionState> {
  const content = String(formData.get("content") ?? "").trim();
  if (!content) return { error: "Le message ne peut pas être vide." };

  const user = await requireUser();
  const organization = await requireOrganization(user.id);
  const organizationId = organization.organization.id;

  const conversation = await getConversation(organizationId, user.id, conversationId);
  if (!conversation) return { error: "Conversation introuvable." };

  const supabase = await createClient();

  const { error: insertUserError } = await supabase.from("ai_messages").insert({
    organization_id: organizationId,
    conversation_id: conversationId,
    role: "user",
    content,
  });
  if (insertUserError) return { error: insertUserError.message };

  if (!conversation.title) {
    await supabase
      .from("ai_conversations")
      .update({ title: content.slice(0, 60), updated_at: new Date().toISOString() })
      .eq("id", conversationId);
  } else {
    await supabase.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
  }

  const history = await getConversationMessages(conversationId);
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...toOpenAiMessages(history),
  ];

  const client = getOpenAIClient();
  let finalContent = "";

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const completion = await client.chat.completions.create({
        model: AI_MODEL,
        messages,
        tools: getToolSpecs(),
      });
      const choice = completion.choices[0]?.message;
      if (!choice) {
        return { error: "L'assistant IA n'a renvoyé aucune réponse." };
      }

      if (!choice.tool_calls || choice.tool_calls.length === 0) {
        finalContent = choice.content ?? "";
        await supabase.from("ai_messages").insert({
          organization_id: organizationId,
          conversation_id: conversationId,
          role: "assistant",
          content: finalContent,
        });
        break;
      }

      await supabase.from("ai_messages").insert({
        organization_id: organizationId,
        conversation_id: conversationId,
        role: "assistant",
        content: choice.content ?? "",
        metadata: { tool_calls: choice.tool_calls },
      });
      messages.push({ role: "assistant", content: choice.content, tool_calls: choice.tool_calls });

      for (const toolCall of choice.tool_calls) {
        if (toolCall.type !== "function") continue;
        const result = await executeTool(toolCall.function.name);
        const resultJson = JSON.stringify(result);
        await supabase.from("ai_messages").insert({
          organization_id: organizationId,
          conversation_id: conversationId,
          role: "tool",
          content: resultJson,
          metadata: { tool_call_id: toolCall.id, name: toolCall.function.name },
        });
        messages.push({ role: "tool", content: resultJson, tool_call_id: toolCall.id });
      }

      if (round === MAX_TOOL_ROUNDS - 1) {
        finalContent = "Désolé, je n'ai pas pu terminer de traiter cette demande.";
        await supabase.from("ai_messages").insert({
          organization_id: organizationId,
          conversation_id: conversationId,
          role: "assistant",
          content: finalContent,
        });
      }
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Échec de la communication avec l'assistant IA." };
  }

  revalidatePath(`/ai/${conversationId}`);
  revalidatePath("/ai");
  return {};
}
