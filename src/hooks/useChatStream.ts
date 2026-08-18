import { useCallback, useState } from "react";
import { api } from "../lib/api";
import type { ChatMessage } from "../lib/types";

function attachFollowups(msgs: ChatMessage[], followups?: string[] | null): ChatMessage[] {
  if (!followups?.length) return msgs;
  const next = [...msgs];
  for (let i = next.length - 1; i >= 0; i--) {
    if (next[i].role === "assistant") {
      next[i] = { ...next[i], followups };
      break;
    }
  }
  return next;
}

export function useChatStream() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState("");

  const loadConversation = useCallback(async (id: number) => {
    const msgs = await api.getMessages(id);
    setActiveId(id);
    setMessages(msgs);
    setError(null);
    setStreaming("");
  }, []);

  const newChat = useCallback(() => {
    setActiveId(null);
    setMessages([]);
    setStreaming("");
    setError(null);
  }, []);

  const send = useCallback(
    async (text: string, attachmentId?: number | null) => {
      const q = text.trim();
      if (!q || busy) return;
      setBusy(true);
      setError(null);
      setStreaming("");
      setMessages((m) => [...m, { id: `tmp-u-${Date.now()}`, role: "user", content: q }]);

      try {
        let convId = activeId;
        let assembled = "";
        const done = await api.streamChat(
          q,
          convId,
          {
            onMeta: (id) => {
              convId = id;
              setActiveId(id);
            },
            onToken: (chunk) => {
              assembled += chunk;
              setStreaming(assembled);
            },
          },
          attachmentId
        );

        setStreaming("");
        if (done.conversation_id) {
          const msgs = await api.getMessages(done.conversation_id);
          setMessages(attachFollowups(msgs, done.followups));
          setActiveId(done.conversation_id);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: `tmp-a-${Date.now()}`,
              role: "assistant",
              content: assembled || "No response content.",
              citations: done.citations,
              followups: done.followups,
              accessDenied: Boolean(done.access_denied),
              restrictedHints: done.restricted_hints,
            },
          ]);
        }
        return done;
      } catch (e: any) {
        setError(e?.message || "Chat failed");
        setStreaming("");
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [activeId, busy]
  );

  return {
    messages,
    activeId,
    busy,
    error,
    streaming,
    setError,
    loadConversation,
    newChat,
    send,
    setActiveId,
    setMessages,
  };
}
