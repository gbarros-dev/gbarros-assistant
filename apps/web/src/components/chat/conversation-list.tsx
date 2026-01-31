"use client";

import { useQuery } from "convex/react";
import { api } from "@gbarros-assistant/backend/convex/_generated/api";
import type { Id } from "@gbarros-assistant/backend/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { MessageSquare } from "lucide-react";

interface ConversationListProps {
  userId: Id<"users">;
  activeConversationId: Id<"conversations"> | null;
  onSelect: (id: Id<"conversations">) => void;
}

export function ConversationList({
  userId,
  activeConversationId,
  onSelect,
}: ConversationListProps) {
  const conversations = useQuery(api.conversations.listByUser, { userId });

  if (!conversations || conversations.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">No conversations yet. Send a message to start one.</div>
    );
  }

  return (
    <div className="flex flex-col gap-1 p-2">
      {conversations.map((conv) => (
        <button
          key={conv._id}
          onClick={() => onSelect(conv._id)}
          className={cn(
            "flex items-center gap-2 rounded-sm px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
            activeConversationId === conv._id && "bg-muted",
          )}
        >
          <MessageSquare className="size-4 shrink-0" />
          <span className="truncate">{conv.title || "Chat"}</span>
        </button>
      ))}
    </div>
  );
}
