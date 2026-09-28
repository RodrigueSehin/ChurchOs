import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createConversation } from "@/features/ai/actions";

export function NewConversationButton() {
  return (
    <form action={createConversation}>
      <Button type="submit">
        <Plus className="size-4" />
        Nouvelle conversation
      </Button>
    </form>
  );
}
