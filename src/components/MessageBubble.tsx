import ReactMarkdown from "react-markdown";
import { ShieldAlert } from "lucide-react";
import type { ChatMessage, Citation } from "../lib/types";

export default function MessageBubble({
  message,
  compact = false,
  onFollowup,
}: {
  message: ChatMessage;
  compact?: boolean;
  onFollowup?: (question: string) => void;
}) {
  const isUser = message.role === "user";
  const denied =
    message.accessDenied ||
    message.content.startsWith("⚠️") ||
    /do not have access/i.test(message.content);
  const followups = (message.followups || []).filter(Boolean).slice(0, 2);

  return (
    <div className={`msg-in flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[92%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
          isUser
            ? "bg-portal-invert text-portal-invert-text"
            : denied
              ? "border border-portal-danger-border bg-portal-danger-bg text-portal-danger"
              : compact
                ? "border border-portal-border bg-portal-muted-bg text-portal-text"
                : "border border-portal-border bg-portal-card text-portal-text"
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
            <ReactMarkdown className="prose-portal">{message.content}</ReactMarkdown>
            {!!message.citations?.length && (
              <div className="mt-2 border-t border-portal-border pt-2">
                <div className="mb-1 text-[10px] uppercase tracking-wide text-portal-muted">Sources</div>
                <ul className="space-y-1 text-[11px] text-portal-muted">
                  {message.citations.map((c: Citation, i) => (
                    <li key={`${c.document_id}-${i}`}>
                      {c.title} · {c.department_folder} · L{c.min_clearance}+
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {!!followups.length && !denied && (
              <div className="mt-2 border-t border-portal-border pt-2">
                <div className="mb-1 text-[10px] uppercase tracking-wide text-portal-muted">Explore more</div>
                <div className="space-y-1">
                  {followups.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => onFollowup?.(q)}
                      className="block w-full truncate rounded-lg border border-portal-border px-2 py-1.5 text-left text-[11px] text-portal-muted hover:border-portal-invert hover:text-portal-text"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!!message.restrictedHints?.length && (
              <div className="mt-2 text-[11px] text-portal-warn">
                Restricted matches: {message.restrictedHints.map((h) => h.title).join(", ")}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
