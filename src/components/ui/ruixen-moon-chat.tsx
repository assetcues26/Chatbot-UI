import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ImageIcon,
  FileUp,
  MonitorIcon,
  CircleUserRound,
  ArrowUpIcon,
  Code2,
  Palette,
  Layers,
  Rocket,
  MessageSquarePlus,
  History,
  ChevronRight,
  Sparkles,
  Paperclip,
  Pin,
  Trash2,
  Copy,
  CheckSquare,
  Download,
  Pencil,
} from "lucide-react";
import type { ChatMessage, Conversation } from "@/lib/types";

interface AutoResizeProps {
  minHeight: number;
  maxHeight?: number;
}

function useAutoResizeTextarea({ minHeight, maxHeight }: AutoResizeProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }

      textarea.style.height = `${minHeight}px`;
      const newHeight = Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight ?? Infinity));
      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight]
  );

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.style.height = `${minHeight}px`;
  }, [minHeight]);

  return { textareaRef, adjustHeight };
}

export type QuickActionItem = {
  label: string;
  icon?: ReactNode;
  prompt?: string;
};

export type RuixenMoonChatProps = {
  title?: string;
  subtitle?: string;
  department?: string;
  connected?: boolean;
  busy?: boolean;
  error?: string | null;
  streaming?: string;
  messages?: ChatMessage[];
  suggestions?: QuickActionItem[];
  conversations?: Conversation[];
  activeId?: number | null;
  historyQuery?: string;
  attachmentName?: string | null;
  onHistoryQuery?: (q: string) => void;
  onSend?: (message: string) => void | Promise<void>;
  onNewChat?: () => void;
  onLoadConversation?: (id: number) => void;
  onRenameConversation?: (id: number, title: string) => void | Promise<void>;
  onPinConversation?: (id: number, pinned: boolean) => void | Promise<void>;
  onDeleteConversation?: (id: number) => void | Promise<void>;
  onUploadPdf?: (file: File) => void | Promise<void>;
  onClearAttachment?: () => void;
  onAddTask?: (content: string) => void | Promise<void>;
  onCollapse?: () => void;
  /** page = full viewport hero; panel = portal sidebar chat */
  variant?: "page" | "panel";
};

const DEFAULT_ACTIONS: QuickActionItem[] = [
  { icon: <Code2 className="w-4 h-4" />, label: "Generate Code", prompt: "Help me generate code for…" },
  { icon: <Rocket className="w-4 h-4" />, label: "Launch App", prompt: "How do we launch a new app release?" },
  { icon: <Layers className="w-4 h-4" />, label: "UI Components", prompt: "Suggest UI components for our portal" },
  { icon: <Palette className="w-4 h-4" />, label: "Theme Ideas", prompt: "Give me theme ideas for AssetCues" },
  { icon: <CircleUserRound className="w-4 h-4" />, label: "User Dashboard", prompt: "What belongs on the user dashboard?" },
  { icon: <MonitorIcon className="w-4 h-4" />, label: "Landing Page", prompt: "Draft a landing page outline" },
  { icon: <FileUp className="w-4 h-4" />, label: "Upload Docs", prompt: "How do I upload docs for the chatbot?" },
  { icon: <ImageIcon className="w-4 h-4" />, label: "Image Assets", prompt: "Help me plan image assets for the brand" },
];

export default function RuixenMoonChat({
  title = "AssetCues AI",
  subtitle = "Ask company knowledge — just start typing below.",
  department,
  connected = true,
  busy = false,
  error = null,
  streaming = "",
  messages = [],
  suggestions,
  conversations = [],
  activeId = null,
  onSend,
  onNewChat,
  onLoadConversation,
  onRenameConversation,
  onPinConversation,
  onDeleteConversation,
  onUploadPdf,
  onClearAttachment,
  onAddTask,
  historyQuery = "",
  attachmentName = null,
  onHistoryQuery,
  onCollapse,
  variant = "page",
}: RuixenMoonChatProps) {
  const [message, setMessage] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 48,
    maxHeight: 150,
  });

  const actions = suggestions?.length ? suggestions : DEFAULT_ACTIONS;
  const hasThread = messages.length > 0 || Boolean(streaming);
  const canSend = Boolean(message.trim()) && !busy && Boolean(onSend);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming, busy]);

  async function submit(text?: string) {
    const q = (text ?? message).trim();
    if (!q || busy || !onSend) return;
    setMessage("");
    adjustHeight(true);
    await onSend(q);
  }

  async function copyThread() {
    const text = messages
      .map((m) => `**${m.role === "user" ? "You" : "AssetCues"}:**\n${m.content}`)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text || subtitle);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  function downloadThread() {
    const text = messages
      .map((m) => `**${m.role === "user" ? "You" : "AssetCues"}:**\n${m.content}`)
      .join("\n\n");
    const blob = new Blob([text || subtitle], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `assetcues-chat-${activeId || "new"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      className={cn(
        "relative flex w-full flex-col bg-transparent",
        variant === "page" ? "h-full min-h-[70vh]" : "h-full"
      )}
    >
      <div className="glass flex items-center gap-2 border-b border-portal-border px-4 py-3">
        {onCollapse && (
          <Button type="button" variant="ghost" size="icon" onClick={onCollapse} title="Collapse">
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
        <div className="chat-avatar chat-avatar-ai chat-empty-mark">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold tracking-tight text-portal-text">{title}</div>
          <div className="flex items-center gap-1.5 text-[10px] text-portal-muted">
            <span className={cn("inline-block h-1.5 w-1.5 rounded-full", connected ? "bg-portal-invert chat-online-dot" : "bg-portal-muted")} />
            {connected ? "Online" : "Offline"}
            {department ? ` · ${department}` : ""}
          </div>
        </div>
        {onLoadConversation && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowHistory((v) => !v)}>
            <History className="mr-1 h-3.5 w-3.5" />
            {showHistory ? "Chat" : "History"}
          </Button>
        )}
        {onNewChat && (
          <Button type="button" variant="ghost" size="icon" onClick={onNewChat} title="New chat">
            <MessageSquarePlus className="h-4 w-4" />
          </Button>
        )}
        {hasThread && (
          <>
            <Button type="button" variant="ghost" size="icon" onClick={() => void copyThread()} title="Copy thread">
              <Copy className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={downloadThread} title="Download thread">
              <Download className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {showHistory ? (
        <div className="flex-1 overflow-y-auto p-3 chat-scroll">
          <input
            value={historyQuery}
            onChange={(e) => onHistoryQuery?.(e.target.value)}
            placeholder="Search chats…"
            className="mb-3 w-full rounded-xl border border-portal-border bg-transparent px-3 py-2 text-xs text-portal-text outline-none placeholder:text-portal-muted"
          />
          {conversations.length === 0 && (
            <p className="px-2 py-6 text-center text-xs text-portal-muted">No conversations yet</p>
          )}
          {conversations.map((c, i) => (
            <div
              key={c.id}
              style={{ animationDelay: `${i * 40}ms` }}
              className={cn(
                "chat-chip mb-1 flex items-center gap-1 rounded-xl px-2 py-1.5 text-xs",
                activeId === c.id ? "bg-portal-invert text-portal-invert-text" : "text-portal-muted"
              )}
            >
              <button
                type="button"
                onClick={() => {
                  onLoadConversation?.(c.id);
                  setShowHistory(false);
                }}
                className="min-w-0 flex-1 truncate px-1 py-1 text-left"
              >
                {c.pinned ? "📌 " : ""}
                {c.title || `Chat #${c.id}`}
              </button>
              <button
                type="button"
                title={c.pinned ? "Unpin" : "Pin"}
                className="rounded p-1 hover:bg-black/10"
                onClick={() => void onPinConversation?.(c.id, !c.pinned)}
              >
                <Pin className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="Rename"
                className="rounded p-1 hover:bg-black/10"
                onClick={() => {
                  const next = window.prompt("Rename chat", c.title || "");
                  if (next?.trim()) void onRenameConversation?.(c.id, next.trim());
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="Delete"
                className="rounded p-1 hover:bg-black/10"
                onClick={() => {
                  if (window.confirm("Delete this chat?")) void onDeleteConversation?.(c.id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {!hasThread ? (
            <div className="flex w-full flex-1 flex-col items-center justify-center px-4">
              <div className="chat-avatar chat-avatar-ai chat-empty-mark mb-4 h-14 w-14">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="text-center">
                <h1 className="text-3xl font-semibold tracking-tight text-portal-text md:text-4xl">{title}</h1>
                <p className="mt-2 max-w-md text-sm text-portal-muted">{subtitle}</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 chat-scroll">
              <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
                {messages.map((m, i) => (
                  <ChatRow
                    key={String(m.id)}
                    message={m}
                    delay={Math.min(i, 8) * 45}
                    onFollowup={onSend}
                    onAddTask={onAddTask}
                    busy={busy}
                  />
                ))}
                {busy && !streaming && (
                  <div className="chat-row chat-row-ai">
                    <div className="chat-avatar chat-avatar-ai">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <div className="chat-bubble chat-bubble-ai">
                      <div className="chat-typing" aria-label="Thinking">
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  </div>
                )}
                {streaming && (
                  <div className="chat-row chat-row-ai">
                    <div className="chat-avatar chat-avatar-ai">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <div className="chat-bubble chat-bubble-ai chat-caret">
                      <ReactMarkdown className="prose-portal text-sm">{streaming}</ReactMarkdown>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </div>
          )}

          <div className={cn("w-full px-4 pb-5", !hasThread && "mb-[6vh]")}>
            <div className="chat-composer glass relative mx-auto w-full max-w-3xl border border-portal-border">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  adjustHeight();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void submit();
                  }
                }}
                placeholder="Ask anything about your company docs…"
                className="min-h-[48px] w-full resize-none border-none bg-transparent px-4 py-3 text-sm text-portal-text focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-portal-muted"
                style={{ overflow: "hidden" }}
                disabled={busy}
              />

              <div className="flex items-center justify-between px-3 pb-3">
                <div className="flex min-w-0 items-center gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) void onUploadPdf?.(file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={busy || !onUploadPdf}
                    onClick={() => fileRef.current?.click()}
                    title="Attach a PDF"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  {attachmentName && (
                    <button
                      type="button"
                      onClick={() => onClearAttachment?.()}
                      className="truncate rounded-full border border-portal-border px-2 py-1 text-[11px] text-portal-muted"
                      title="Remove file"
                    >
                      {attachmentName} ×
                    </button>
                  )}
                  {copied && <span className="text-[11px] text-portal-muted">Copied</span>}
                </div>
                <Button
                  type="button"
                  disabled={!canSend}
                  onClick={() => void submit()}
                  className={cn(
                    "chat-send grid h-10 w-10 place-items-center rounded-full p-0",
                    canSend
                      ? "chat-send-ready bg-portal-invert text-portal-invert-text hover:opacity-90"
                      : "cursor-not-allowed border border-portal-border bg-portal-muted-bg text-portal-muted"
                  )}
                >
                  <ArrowUpIcon className="h-4 w-4" />
                  <span className="sr-only">Send</span>
                </Button>
              </div>
            </div>

            {error && (
              <p className="mx-auto mt-2 max-w-3xl rounded-lg border border-portal-danger-border bg-portal-danger-bg px-3 py-2 text-xs text-portal-danger">
                {error}
              </p>
            )}

            {!hasThread && (
              <div className="mx-auto mt-6 flex max-w-3xl flex-wrap items-center justify-center gap-2.5">
                {actions.slice(0, 6).map((a, i) => (
                  <QuickAction
                    key={a.label}
                    icon={a.icon}
                    label={a.label}
                    delay={120 + i * 50}
                    disabled={busy || !onSend}
                    onClick={() => void submit(a.prompt || a.label)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ChatRow({
  message,
  delay = 0,
  onFollowup,
  onAddTask,
  busy,
}: {
  message: ChatMessage;
  delay?: number;
  onFollowup?: (question: string) => void | Promise<void>;
  onAddTask?: (content: string) => void | Promise<void>;
  busy?: boolean;
}) {
  const isUser = message.role === "user";
  const followups = (message.followups || []).filter(Boolean).slice(0, 2);
  const denied =
    message.accessDenied ||
    message.content.startsWith("⚠️") ||
    /do not have access/i.test(message.content);

  return (
    <div
      className={cn("chat-row", isUser ? "chat-row-user" : "chat-row-ai")}
      style={{ animationDelay: `${delay}ms` }}
    >
      {!isUser && (
        <div className="chat-avatar chat-avatar-ai">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
      )}
      <div className={cn("chat-bubble", isUser ? "chat-bubble-user" : "chat-bubble-ai")}>
        {isUser ? (
          message.content
        ) : (
          <>
            <ReactMarkdown className="prose-portal text-sm">{message.content}</ReactMarkdown>
            {!!message.citations?.length && (
              <div className="mt-3 border-t border-portal-border pt-2">
                <div className="mb-1 text-[10px] uppercase tracking-wide text-portal-muted">Sources</div>
                <ul className="space-y-1 text-[11px] text-portal-muted">
                  {message.citations.map((c, i) => (
                    <li key={`${c.document_id}-${i}`}>
                      {c.title} · {c.department_folder}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {!!followups.length && !denied && (
              <div className="mt-3 border-t border-portal-border pt-2">
                <div className="mb-1 text-[10px] uppercase tracking-wide text-portal-muted">Explore more</div>
                <div className="space-y-1">
                  {followups.map((q) => (
                    <button
                      key={q}
                      type="button"
                      disabled={busy}
                      onClick={() => void onFollowup?.(q)}
                      className="block w-full truncate rounded-lg border border-portal-border px-2 py-1.5 text-left text-[11px] text-portal-muted hover:border-portal-invert hover:text-portal-text"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!!onAddTask && !denied && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void onAddTask(message.content)}
                className="mt-2 inline-flex items-center gap-1 text-[11px] text-portal-muted hover:text-portal-text"
              >
                <CheckSquare className="h-3 w-3" /> Add to tasks
              </button>
            )}
          </>
        )}
      </div>
      {isUser && (
        <div className="chat-avatar chat-avatar-user">
          <CircleUserRound className="h-3.5 w-3.5" />
        </div>
      )}
    </div>
  );
}

interface QuickActionProps {
  icon?: ReactNode;
  label: string;
  disabled?: boolean;
  delay?: number;
  onClick?: () => void;
}

function QuickAction({ icon, label, disabled, delay = 0, onClick }: QuickActionProps) {
  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled}
      onClick={onClick}
      style={{ animationDelay: `${delay}ms` }}
      className="chat-chip glass rounded-full border-portal-border px-3 text-portal-muted hover:border-portal-invert hover:bg-portal-muted-bg hover:text-portal-text"
    >
      {icon}
      <span className="text-xs">{label}</span>
    </Button>
  );
}
