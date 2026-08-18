import { useCallback, useEffect, useState } from "react";
import RuixenMoonChat from "@/components/ui/ruixen-moon-chat";
import { useAuth } from "@/context/AuthContext";
import { useChatStream } from "@/hooks/useChatStream";
import { api } from "@/lib/api";
import { createTask } from "@/lib/portalApi";
import { getActiveTeamId } from "@/lib/storage";
import type { Conversation } from "@/lib/types";
import { suggestionsForDepartment } from "@/lib/teamSuggestions";

export default function ChatPage() {
  const { fastApiUser, connected, supabaseUser } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [historyQuery, setHistoryQuery] = useState("");
  const [attachment, setAttachment] = useState<{ id: number; filename: string } | null>(null);
  const { messages, activeId, busy, error, streaming, send, newChat, loadConversation, setError } = useChatStream();

  const suggestions = suggestionsForDepartment(String(fastApiUser?.department || "engineering")).map((s) => ({
    label: s.question.length > 28 ? `${s.question.slice(0, 28)}…` : s.question,
    prompt: s.question,
  }));

  const refreshConversations = useCallback(async (q?: string) => {
    try {
      setConversations(await api.listConversations(q));
    } catch {
      /* history optional */
    }
  }, []);

  useEffect(() => {
    refreshConversations(historyQuery);
  }, [refreshConversations, historyQuery]);

  async function handleSend(text: string) {
    try {
      await send(text, attachment?.id);
      setAttachment(null);
      await refreshConversations(historyQuery);
    } catch {
      /* error surfaced in hook */
    }
  }

  async function handleUpload(file: File) {
    try {
      const row = await api.uploadChatPdf(file);
      setAttachment({ id: row.id, filename: row.filename });
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Could not read that PDF");
    }
  }

  async function handleRename(id: number, title: string) {
    await api.patchConversation(id, { title });
    await refreshConversations(historyQuery);
  }

  async function handlePin(id: number, pinned: boolean) {
    await api.patchConversation(id, { pinned });
    await refreshConversations(historyQuery);
  }

  async function handleDelete(id: number) {
    await api.deleteConversation(id);
    if (activeId === id) newChat();
    await refreshConversations(historyQuery);
  }

  async function handleAddTask(content: string) {
    const teamId = getActiveTeamId();
    if (!teamId) {
      setError("Pick a team before adding a task");
      return;
    }
    try {
      const title = content.replace(/\s+/g, " ").trim().slice(0, 80) || "Chat follow-up";
      await createTask({
        team_id: teamId,
        title,
        description: content.slice(0, 4000),
        created_by: supabaseUser?.id || String(fastApiUser?.id || "local"),
      });
    } catch (e: any) {
      setError(e?.message || "Could not add task");
    }
  }

  return (
    <div className="page-enter flex h-full min-h-0 flex-col">
      <RuixenMoonChat
        variant="page"
        title="AssetCues AI"
        subtitle="Ask across your team knowledge — start typing below."
        department={String(fastApiUser?.department || "")}
        connected={connected}
        busy={busy}
        error={error}
        streaming={streaming}
        messages={messages}
        suggestions={suggestions}
        conversations={conversations}
        activeId={activeId}
        historyQuery={historyQuery}
        onHistoryQuery={setHistoryQuery}
        attachmentName={attachment?.filename || null}
        onClearAttachment={() => setAttachment(null)}
        onUploadPdf={handleUpload}
        onRenameConversation={handleRename}
        onPinConversation={handlePin}
        onDeleteConversation={handleDelete}
        onAddTask={handleAddTask}
        onSend={handleSend}
        onNewChat={() => {
          setAttachment(null);
          newChat();
        }}
        onLoadConversation={loadConversation}
      />
    </div>
  );
}
