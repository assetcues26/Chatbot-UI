import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  LogOut,
  MessageSquarePlus,
  PanelLeft,
  PanelLeftClose,
  Send,
  Shield,
  ShieldAlert,
  Sparkles,
  Trash2,
} from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import { api } from "../lib/api";
import type { ChatMessage, Citation, CompanyUser, Conversation } from "../lib/types";
import { CLEARANCE_LABEL } from "../lib/types";
import { suggestionsForDepartment } from "../lib/teamSuggestions";

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

export default function CompanyChatbot({
  connected,
  sessionUser,
  onLogout,
}: {
  connected: boolean;
  onConnectionChange?: () => void;
  sessionUser: CompanyUser;
  onLogout: () => void;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const suggestions = suggestionsForDepartment(String(sessionUser.department));

  const refreshConversations = useCallback(async () => {
    const list = await api.listConversations();
    setConversations(list);
  }, []);

  const loadConversation = useCallback(async (id: number) => {
    const msgs = await api.getMessages(id);
    setActiveId(id);
    setMessages(msgs);
    setError(null);
  }, []);

  useEffect(() => {
    refreshConversations().catch((e) => setError(e?.message || "Failed to load chats"));
  }, [refreshConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming, busy]);

  function newChat() {
    setActiveId(null);
    setMessages([]);
    setStreaming("");
    setError(null);
    inputRef.current?.focus();
  }

  async function removeConversation(id: number) {
    await api.deleteConversation(id);
    if (activeId === id) newChat();
    await refreshConversations();
  }

  async function send(text?: string) {
    const q = (text ?? question).trim();
    if (!q || busy) return;
    setQuestion("");
    setBusy(true);
    setError(null);
    setStreaming("");
    setMessages((m) => [...m, { id: `tmp-u-${Date.now()}`, role: "user", content: q }]);

    try {
      let convId = activeId;
      let assembled = "";
      const done = await api.streamChat(q, convId, {
        onMeta: (id) => {
          convId = id;
          setActiveId(id);
        },
        onToken: (chunk) => {
          assembled += chunk;
          setStreaming(assembled);
        },
      });

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
      await refreshConversations();
    } catch (e: any) {
      setError(e?.message || "Chat failed");
      setStreaming("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-portal-bg text-portal-text">
      {/* Sidebar */}
      <aside
        className={`flex shrink-0 flex-col border-r border-chat-border bg-chat-panel transition-all ${
          sidebarOpen ? "w-[280px]" : "w-0 overflow-hidden border-0"
        }`}
      >
        <div className="flex items-center gap-2 border-b border-chat-border px-4 py-3.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-portal-invert text-xs font-bold text-portal-invert-text">
            AC
          </div>
          <div className="min-w-0">
            <div className="font-display truncate text-sm font-semibold">AssetCues</div>
            <div className="truncate text-[10px] text-chat-muted">Knowledge chatbot</div>
          </div>
        </div>

        <div className="border-b border-chat-border p-3">
          <button
            type="button"
            onClick={newChat}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-portal-invert py-2 text-xs font-semibold text-portal-invert-text"
          >
            <MessageSquarePlus size={14} /> New chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {conversations.length === 0 && (
            <p className="px-2 py-4 text-center text-[11px] text-chat-muted">No conversations yet</p>
          )}
          {conversations.map((c) => (
            <div
              key={c.id}
              className={`group mb-1 flex items-center gap-1 rounded-xl px-2 py-2 text-left text-xs ${
                activeId === c.id ? "bg-portal-invert text-portal-invert-text" : "hover:bg-portal-muted-bg text-portal-muted"
              }`}
            >
              <button type="button" className="min-w-0 flex-1 truncate text-left" onClick={() => loadConversation(c.id)}>
                {c.title || `Chat #${c.id}`}
              </button>
              <button
                type="button"
                className="rounded p-1 opacity-0 hover:bg-portal-danger-bg hover:text-portal-danger group-hover:opacity-100"
                onClick={() => removeConversation(c.id)}
                title="Delete"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-chat-border p-3">
          <div className="rounded-2xl border border-chat-border bg-chat-elev p-3">
            <div className="text-[13px] font-semibold">{sessionUser.full_name}</div>
            <div className="mt-0.5 truncate font-mono text-[10px] text-portal-muted">{sessionUser.email}</div>
            <div className="mt-1 text-[10px] uppercase tracking-wide text-chat-muted">
              {sessionUser.department} · {CLEARANCE_LABEL[sessionUser.clearance_level] || `L${sessionUser.clearance_level}`}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-chat-muted">
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-portal-invert" : "bg-portal-warn"}`} />
              {connected ? "API online" : "API offline"}
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-chat-border py-2 text-xs text-chat-muted hover:bg-chat-elev hover:text-chat-text"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-chat-border px-4 py-3">
          <button
            type="button"
            className="rounded-lg p-1.5 text-chat-muted hover:bg-chat-elev"
            onClick={() => setSidebarOpen((v) => !v)}
          >
            {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
          </button>
          <div className="min-w-0 flex-1">
            <div className="font-display text-sm font-semibold">Company assistant</div>
            <div className="text-[11px] text-chat-muted">Answers from docs you are allowed to see</div>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <ThemeToggle compact />
            <div className="hidden items-center gap-1.5 rounded-full bg-portal-muted-bg px-2.5 py-1 text-[10px] text-portal-muted sm:flex">
              <Shield size={12} />
              ACL · MiniLM · Groq
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 && !streaming && (
            <div className="mx-auto max-w-2xl text-center">
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-portal-border bg-portal-muted-bg text-portal-text">
                <Sparkles size={22} />
              </div>
              <h2 className="font-display text-xl font-semibold">Ask your knowledge base</h2>
              <p className="mt-2 text-sm text-chat-muted">
                Signed in as {sessionUser.department} · clearance L{sessionUser.clearance_level}
              </p>
              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {suggestions.map((s) => (
                  <button
                    key={s.question}
                    type="button"
                    onClick={() => send(s.question)}
                    className={`rounded-2xl border px-3 py-3 text-left text-xs transition hover:bg-chat-elev ${
                      s.kind === "restricted"
                        ? "border-portal-danger-border text-portal-danger"
                        : "border-chat-border text-chat-muted"
                    }`}
                  >
                    <div className="mb-1 text-[10px] uppercase tracking-wide opacity-70">{s.hint}</div>
                    {s.question}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mx-auto max-w-2xl space-y-4">
            {messages.map((m) => (
              <MessageBubble key={String(m.id)} message={m} onFollowup={(q) => send(q)} />
            ))}
            {streaming && (
              <div className="rounded-2xl border border-chat-border bg-chat-elev px-4 py-3 text-sm leading-relaxed">
                <ReactMarkdown>{streaming}</ReactMarkdown>
              </div>
            )}
            {busy && !streaming && (
              <div className="text-xs text-chat-muted">Retrieving allowed sources…</div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {error && (
          <div className="mx-4 mb-2 rounded-xl border border-portal-danger-border bg-portal-danger-bg px-3 py-2 text-xs text-portal-danger">
            {error}
          </div>
        )}

        <div className="border-t border-chat-border p-4">
          <div className="mx-auto flex max-w-2xl items-end gap-2">
            <textarea
              ref={inputRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder="Ask about company knowledge…"
              className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-portal-border bg-portal-muted-bg px-4 py-3 text-sm outline-none focus:border-portal-invert"
            />
            <button
              type="button"
              disabled={busy || !question.trim()}
              onClick={() => send()}
              className="grid h-11 w-11 place-items-center rounded-2xl bg-portal-invert text-portal-invert-text disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function MessageBubble({ message, onFollowup }: { message: ChatMessage; onFollowup?: (q: string) => void }) {
  const isUser = message.role === "user";
  const denied =
    message.accessDenied ||
    message.content.startsWith("⚠️") ||
    /do not have access/i.test(message.content);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-portal-invert text-portal-invert-text"
            : denied
              ? "border border-portal-danger-border bg-portal-danger-bg text-portal-danger"
              : "border border-chat-border bg-chat-elev"
        }`}
      >
        {isUser ? (
          message.content
        ) : (
          <>
            {denied && (
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-portal-danger">
                <ShieldAlert size={14} /> Access restricted
              </div>
            )}
            <ReactMarkdown>{message.content}</ReactMarkdown>
            {!!message.citations?.length && (
              <div className="mt-3 border-t border-chat-border/60 pt-2">
                <div className="mb-1 text-[10px] uppercase tracking-wide text-chat-muted">Sources</div>
                <ul className="space-y-1 text-[11px] text-chat-muted">
                  {message.citations.map((c: Citation, i) => (
                    <li key={`${c.document_id}-${i}`}>
                      {c.title} · {c.department_folder} · L{c.min_clearance}+
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {!!message.followups?.length && !denied && (
              <div className="mt-3 border-t border-chat-border/60 pt-2">
                <div className="mb-1 text-[10px] uppercase tracking-wide text-chat-muted">Explore more</div>
                <div className="space-y-1">
                  {message.followups.slice(0, 2).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => onFollowup?.(q)}
                      className="block w-full truncate rounded-lg border border-chat-border px-2 py-1.5 text-left text-[11px] text-chat-muted hover:border-portal-invert hover:text-portal-text"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!!message.restrictedHints?.length && (
              <div className="mt-2 text-[11px] text-amber-300/90">
                Restricted matches (titles only):{" "}
                {message.restrictedHints.map((h) => h.title).join(", ")}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
