import { notFound } from "next/navigation";

import { requireOrganization, requireUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { getConversation, getConversationMessages } from "@/features/ai/queries";
import { ChatPanel } from "@/features/ai/components/chat-panel";

export default async function AiConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const organization = await requireOrganization(user.id);

  const conversation = await getConversation(organization.organization.id, user.id, id);
  if (!conversation) notFound();

  const messages = await getConversationMessages(id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={conversation.title ?? "Nouvelle conversation"} />
      <ChatPanel conversationId={id} messages={messages} />
    </div>
  );
}
