import { useCallback, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import type { CompanyUser, Conversation } from "@/lib/types";
import { suggestionsForDepartment } from "@/lib/teamSuggestions";
import { useChatStream } from "@/hooks/useChatStream";
import RuixenMoonChat from "@/components/ui/ruixen-moon-chat";
import { Button } from "@/components/ui/button";

export default function ChatPanel({
  sessionUser,
  connected,
  collapsed,
  onToggle,
}: {
  sessionUser: CompanyUser;
  connected: boolean;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const { messages, activeId, busy, error, streaming, send, newChat, loadConversation } = useChatStream();

  const suggestions = suggestionsForDepartment(String(sessionUser.department)).map((s) => ({
    label: s.question.length > 28 ? `${s.question.slice(0, 28)}…` : s.question,
    prompt: s.question,
  }));

  const refreshConversations = useCallback(async () => {
    try {
      const list = await api.listConversations();
      setConversations(list);
    } catch {
      /* history optional */
    }
  }, []);

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  async function handleSend(text: string) {
    try {
      await send(text);
      await refreshConversations();
    } catch {
      /* error surfaced in hook */
    }
  }

  if (collapsed) {
    return (
      <aside className="chat-enter relative z-10 flex w-12 shrink-0 flex-col items-center border-l border-white/10 bg-black py-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="glass text-white hover:bg-white/15"
          title="Open assistant"
        >
          <Sparkles size={18} />
        </Button>
      </aside>
    );
  }

  return (
    <aside className="chat-enter relative z-10 flex w-[min(440px,100%)] shrink-0 flex-col border-l border-white/10 bg-black">
      <RuixenMoonChat
        variant="panel"
        title="AssetCues AI"
        subtitle="Ask company knowledge — just start typing below."
        department={String(sessionUser.department)}
        connected={connected}
        busy={busy}
        error={error}
        streaming={streaming}
        messages={messages}
        suggestions={suggestions}
        conversations={conversations}
        activeId={activeId}
        onSend={handleSend}
        onNewChat={newChat}
        onLoadConversation={loadConversation}
        onCollapse={onToggle}
      />
    </aside>
  );
}
