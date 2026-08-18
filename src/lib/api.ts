import { getToken, setToken } from "./storage";
import type {
  AccessAlert,
  AuthUser,
  ChatMessage,
  Citation,
  Conversation,
  DocumentInfo,
  StreamDoneEvent,
} from "./types";
import { toCompanyUser } from "./types";

async function parseError(res: Response): Promise<string> {
  const json = await res.json().catch(() => ({} as any));
  if (typeof json?.detail === "string") return json.detail;
  if (Array.isArray(json?.detail)) {
    return json.detail.map((d: any) => d?.msg || JSON.stringify(d)).join("; ");
  }
  return json?.error || `Request failed (${res.status})`;
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<T>;
}

function authHeaders(json = true): HeadersInit {
  const headers: Record<string, string> = {};
  if (json) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/** Empty in local Vite unless set. Production defaults to the Render API. */
const API_BASE = String(
  import.meta.env.VITE_API_URL ||
    (import.meta.env.PROD ? "https://chatbot-backend-h6oj.onrender.com" : "")
).replace(/\/$/, "");

function apiFetch(path: string, init?: RequestInit) {
  return fetch(`${API_BASE}${path}`, init);
}

export const api = {
  health: () => apiFetch("/api/health").then((r) => handle<{ ok: boolean; cors: string[] }>(r)),

  login: async (email: string, password: string) => {
    const body = new URLSearchParams();
    body.set("username", email);
    body.set("password", password);
    const res = await apiFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = await handle<{ access_token: string; token_type: string }>(res);
    setToken(data.access_token);
    const me = await api.me();
    return { token: data.access_token, user: toCompanyUser(me) };
  },

  me: () => apiFetch("/api/auth/me", { headers: authHeaders(false) }).then((r) => handle<AuthUser>(r)),

  exchangeSupabase: async (supabaseAccessToken: string, teamId: string, departmentKey?: string) => {
    const res = await apiFetch("/api/auth/supabase/exchange", {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify({
        supabase_access_token: supabaseAccessToken,
        team_id: teamId,
        department_key: departmentKey || undefined,
      }),
    });
    const data = await handle<{ access_token: string; token_type: string }>(res);
    setToken(data.access_token);
    const me = await api.me();
    return { token: data.access_token, user: toCompanyUser(me) };
  },

  listConversations: (q?: string) => {
    const qs = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
    return apiFetch(`/api/conversations${qs}`, { headers: authHeaders(false) }).then((r) =>
      handle<Conversation[]>(r)
    );
  },

  patchConversation: (conversationId: number, patch: { title?: string; pinned?: boolean }) =>
    apiFetch(`/api/conversations/${conversationId}`, {
      method: "PATCH",
      headers: authHeaders(true),
      body: JSON.stringify(patch),
    }).then((r) => handle<Conversation>(r)),

  getMessages: (conversationId: number) =>
    apiFetch(`/api/conversations/${conversationId}/messages`, { headers: authHeaders(false) }).then((r) =>
      handle<ChatMessage[]>(r)
    ),

  deleteConversation: (conversationId: number) =>
    apiFetch(`/api/conversations/${conversationId}`, {
      method: "DELETE",
      headers: authHeaders(false),
    }).then((r) => handle<{ ok: boolean }>(r)),

  uploadChatPdf: async (file: File) => {
    const body = new FormData();
    body.append("file", file);
    const res = await apiFetch("/api/chat/attachments", {
      method: "POST",
      headers: authHeaders(false),
      body,
    });
    return handle<{ id: number; filename: string; chars: number }>(res);
  },

  /**
   * Stream chat via SSE. Calls onToken for each chunk; resolves with done payload.
   */
  streamChat: async (
    message: string,
    conversationId: number | null,
    handlers: {
      onMeta?: (conversationId: number) => void;
      onToken?: (content: string) => void;
    },
    attachmentId?: number | null
  ): Promise<StreamDoneEvent> => {
    const res = await apiFetch("/api/chat/stream", {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify({
        message,
        conversation_id: conversationId,
        attachment_id: attachmentId || undefined,
      }),
    });
    if (!res.ok) throw new Error(await parseError(res));
    if (!res.body) throw new Error("No stream body from server");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let doneEvent: StreamDoneEvent | null = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";
      for (const part of parts) {
        const line = part
          .split("\n")
          .map((l) => l.trim())
          .find((l) => l.startsWith("data:"));
        if (!line) continue;
        const raw = line.slice(5).trim();
        if (!raw) continue;
        let evt: any;
        try {
          evt = JSON.parse(raw);
        } catch {
          continue;
        }
        if (evt.type === "meta" && typeof evt.conversation_id === "number") {
          handlers.onMeta?.(evt.conversation_id);
        } else if (evt.type === "token" && typeof evt.content === "string") {
          handlers.onToken?.(evt.content);
        } else if (evt.type === "done") {
          doneEvent = evt as StreamDoneEvent;
        }
      }
    }

    if (!doneEvent) {
      throw new Error("Stream ended without a done event");
    }
    return doneEvent;
  },

  // —— Admin ——
  adminUsers: () =>
    apiFetch("/api/admin/users", { headers: authHeaders(false) }).then((r) => handle<AuthUser[]>(r)),

  createUser: (payload: {
    email: string;
    password: string;
    full_name: string;
    department: string;
    clearance_level: number;
    is_admin?: boolean;
  }) =>
    apiFetch("/api/admin/users", {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify(payload),
    }).then((r) => handle<AuthUser>(r)),

  adminDocuments: () =>
    apiFetch("/api/admin/documents", { headers: authHeaders(false) }).then((r) => handle<DocumentInfo[]>(r)),

  updateDocumentAcl: (
    documentId: number,
    payload: { allowed_departments: string[]; min_clearance: number; company_wide: boolean }
  ) =>
    apiFetch(`/api/admin/documents/${documentId}`, {
      method: "PATCH",
      headers: authHeaders(true),
      body: JSON.stringify(payload),
    }).then((r) => handle<DocumentInfo>(r)),

  ingestAcmetech: () =>
    apiFetch("/api/admin/ingest-acmetech", {
      method: "POST",
      headers: authHeaders(false),
    }).then((r) => handle<{ path?: string; imported: number; ready: number }>(r)),

  ingestDocs: () =>
    apiFetch("/api/admin/ingest-docs", {
      method: "POST",
      headers: authHeaders(false),
    }).then((r) => handle<{ path?: string; imported: number; ready: number }>(r)),

  adminAlerts: (unreadOnly = false) =>
    apiFetch(`/api/admin/alerts?unread_only=${unreadOnly}`, { headers: authHeaders(false) }).then((r) =>
      handle<AccessAlert[]>(r)
    ),

  unreadAlertCount: () =>
    apiFetch("/api/admin/alerts/unread-count", { headers: authHeaders(false) }).then((r) =>
      handle<{ count: number }>(r)
    ),

  ackAlert: (id: number) =>
    apiFetch(`/api/admin/alerts/${id}/ack`, {
      method: "POST",
      headers: authHeaders(false),
    }).then((r) => handle<{ ok: boolean }>(r)),

  ackAllAlerts: () =>
    apiFetch("/api/admin/alerts/ack-all", {
      method: "POST",
      headers: authHeaders(false),
    }).then((r) => handle<{ ok: boolean }>(r)),

  adminActivity: () =>
    apiFetch("/api/admin/activity", { headers: authHeaders(false) }).then((r) =>
      handle<{
        users: number;
        conversations: number;
        messages: number;
        documents: number;
        open_alerts: number;
        recent_chats: AdminChat[];
        recent_queries: AdminQuery[];
      }>(r)
    ),

  adminChats: () =>
    apiFetch("/api/admin/chats", { headers: authHeaders(false) }).then((r) => handle<AdminChat[]>(r)),

  adminChatMessages: (conversationId: number) =>
    apiFetch(`/api/admin/chats/${conversationId}/messages`, { headers: authHeaders(false) }).then((r) =>
      handle<ChatMessage[]>(r)
    ),
};

export interface AdminChat {
  id: number;
  title: string;
  user_id: number;
  user_email: string;
  user_name: string;
  user_department: string;
  message_count: number;
  last_preview: string | null;
  updated_at: string | null;
}

export interface AdminQuery {
  id: number;
  user_email: string;
  user_department: string;
  query: string;
  latency_ms: number;
  created_at: string;
}

export type { Citation };
