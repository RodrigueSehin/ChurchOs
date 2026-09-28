import Link from "next/link";
import { Sparkles } from "lucide-react";

import { requireOrganization, requireUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
import { getConversations } from "@/features/ai/queries";
import { NewConversationButton } from "@/features/ai/components/new-conversation-button";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
}

export default async function AiPage() {
  const user = await requireUser();
  const organization = await requireOrganization(user.id);

  const conversations = await getConversations(organization.organization.id, user.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="ChurchOS AI"
        description="Posez une question sur les membres, présences, finances, événements ou le suivi pastoral de votre église."
        actions={<NewConversationButton />}
      />

      {conversations.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Aucune conversation"
          description="Démarrez votre première conversation avec l'assistant ChurchOS AI."
          action={<NewConversationButton />}
        />
      ) : (
        <Card className="divide-y divide-slate-100 p-0">
          {conversations.map((conversation) => (
            <Link
              key={conversation.id}
              href={`/ai/${conversation.id}`}
              className="flex items-center justify-between px-4 py-3 text-sm hover:bg-slate-50"
            >
              <span className="font-medium text-navy">{conversation.title ?? "Nouvelle conversation"}</span>
              <span className="text-xs text-slate-400">{formatDate(conversation.updatedAt)}</span>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
