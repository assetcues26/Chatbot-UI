import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {
  Activity,
  Bell,
  CheckCircle2,
  CheckSquare,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  RefreshCw,
  Send,
  Shield,
  Users,
} from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import { api, type AdminChat, type AdminQuery } from "../lib/api";
import { listAllTasks, listAllTeams, listTeamMemberCounts } from "../lib/portalApi";
import { TASK_STATUSES, isAdminTeam, type PortalTask, type PortalTeam } from "../lib/portalTypes";
import type { AccessAlert, AuthUser, ChatMessage, CompanyUser, DocumentInfo } from "../lib/types";
import { CLEARANCE_LABEL, DEPARTMENTS } from "../lib/types";

type AdminView = "activity" | "teams" | "tasks" | "people" | "chats" | "documents" | "alerts" | "assistant";

function fmt(ts?: string | null) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString();
}

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

export default function AdminPortal({
  sessionUser,
  connected,
  onLogout,
}: {
  sessionUser: CompanyUser;
  connected: boolean;
  onLogout: () => void;
  onConnectionChange?: () => void;
}) {
  const navigate = useNavigate();
  const [view, setView] = useState<AdminView>("activity");
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [docs, setDocs] = useState<DocumentInfo[]>([]);
  const [alerts, setAlerts] = useState<AccessAlert[]>([]);
  const [unread, setUnread] = useState(0);
  const [chats, setChats] = useState<AdminChat[]>([]);
  const [queries, setQueries] = useState<AdminQuery[]>([]);
  const [teams, setTeams] = useState<PortalTeam[]>([]);
  const [tasks, setTasks] = useState<PortalTask[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [stats, setStats] = useState({ users: 0, conversations: 0, messages: 0, documents: 0, open_alerts: 0 });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ingestMsg, setIngestMsg] = useState<string | null>(null);
  const [openChatId, setOpenChatId] = useState<number | null>(null);
  const [openMsgs, setOpenMsgs] = useState<ChatMessage[]>([]);
  const [openBusy, setOpenBusy] = useState(false);

  const [chatMsgs, setChatMsgs] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatId, setChatId] = useState<number | null>(null);
  const [streaming, setStreaming] = useState("");

  const [newUser, setNewUser] = useState({
    email: "",
    password: "password123",
    full_name: "",
    department: "engineering",
    clearance_level: 2,
    is_admin: false,
  });

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const [u, d, a, c, activity, chatList, teamList, taskList] = await Promise.all([
        api.adminUsers().catch(() => [] as AuthUser[]),
        api.adminDocuments().catch(() => [] as DocumentInfo[]),
        api.adminAlerts(false).catch(() => [] as AccessAlert[]),
        api.unreadAlertCount().catch(() => ({ count: 0 })),
        api.adminActivity().catch(() => null),
        api.adminChats().catch(() => [] as AdminChat[]),
        listAllTeams().catch(() => [] as PortalTeam[]),
        listAllTasks().catch(() => [] as PortalTask[]),
      ]);
      setUsers(u);
      setDocs(d);
      setAlerts(a);
      setUnread(c.count);
      setChats(chatList);
      setTasks(taskList);
      const visibleTeams = teamList.filter((t) => !isAdminTeam(t));
      setTeams(visibleTeams);
      if (activity) {
        setStats({
          users: activity.users,
          conversations: activity.conversations,
          messages: activity.messages,
          documents: activity.documents,
          open_alerts: activity.open_alerts,
        });
        setQueries(activity.recent_queries || []);
        if (!chatList.length) setChats(activity.recent_chats || []);
      }
      try {
        setMemberCounts(await listTeamMemberCounts(visibleTeams.map((t) => t.id)));
      } catch {
        setMemberCounts({});
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load admin data");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
    const t = setInterval(() => load().catch(() => undefined), 20000);
    return () => clearInterval(t);
  }, [load]);

  async function ingest(kind: "acmetech" | "docs") {
    setIngestMsg(null);
    try {
      const r = kind === "docs" ? await api.ingestDocs() : await api.ingestAcmetech();
      const where = r.path ? ` from ${r.path}` : "";
      setIngestMsg(`Imported ${r.imported}, ready ${r.ready}${where}`);
      await load();
    } catch (e: any) {
      setIngestMsg(e?.message || (kind === "docs" ? "Docs ingest failed" : "AcmeTech ingest failed"));
    }
  }

  async function saveDocAcl(doc: DocumentInfo) {
    setError(null);
    try {
      const updated = await api.updateDocumentAcl(doc.id, {
        allowed_departments: doc.allowed_departments,
        min_clearance: doc.min_clearance,
        company_wide: doc.company_wide,
      });
      setDocs((rows) => rows.map((d) => (d.id === updated.id ? updated : d)));
    } catch (e: any) {
      setError(e?.message || "Could not update document ACL");
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    await api.createUser(newUser);
    setNewUser((s) => ({ ...s, email: "", full_name: "" }));
    await load();
  }

  async function ack(id: number) {
    await api.ackAlert(id);
    await load();
  }

  async function ackAll() {
    await api.ackAllAlerts();
    await load();
  }

  async function openChat(id: number) {
    setOpenChatId(id);
    setOpenBusy(true);
    try {
      setOpenMsgs(await api.adminChatMessages(id));
    } catch (e: any) {
      setError(e?.message || "Could not load chat");
    } finally {
      setOpenBusy(false);
    }
  }

  async function sendChat(preset?: string) {
    const q = (preset ?? question).trim();
    if (!q || chatBusy) return;
    setQuestion("");
    setChatBusy(true);
    setStreaming("");
    setChatMsgs((m) => [...m, { id: `u-${Date.now()}`, role: "user", content: q }]);
    try {
      let assembled = "";
      const done = await api.streamChat(q, chatId, {
        onMeta: (id) => setChatId(id),
        onToken: (c) => {
          assembled += c;
          setStreaming(assembled);
        },
      });
      setStreaming("");
      if (done.conversation_id) {
        const msgs = await api.getMessages(done.conversation_id);
        setChatMsgs(attachFollowups(msgs, done.followups));
        setChatId(done.conversation_id);
      }
      await load();
    } catch (e: any) {
      setError(e?.message || "Chat failed");
      setStreaming("");
    } finally {
      setChatBusy(false);
    }
  }

  const taskCounts = useMemo(
    () => ({
      todo: tasks.filter((t) => t.status === "todo").length,
      in_progress: tasks.filter((t) => t.status === "in_progress").length,
      done: tasks.filter((t) => t.status === "done").length,
    }),
    [tasks]
  );

  const teamName = (id: string) => teams.find((t) => t.id === id)?.name || id;

  const nav: { id: AdminView; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "activity", label: "Activity", icon: Activity },
    { id: "teams", label: "Teams", icon: LayoutDashboard },
    { id: "tasks", label: "All tasks", icon: CheckSquare },
    { id: "people", label: "People", icon: Users },
    { id: "chats", label: "All chats", icon: MessageSquare },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "alerts", label: "Alerts", icon: Bell },
    { id: "assistant", label: "Admin chat", icon: Shield },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-portal-bg text-portal-text">
      <aside className="flex w-[260px] shrink-0 flex-col border-r border-portal-border bg-portal-card">
        <div className="flex items-center gap-2 border-b border-portal-border px-4 py-3.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-portal-invert text-xs font-bold text-portal-invert-text">
            AD
          </div>
          <div>
            <div className="font-display text-sm font-semibold">Admin portal</div>
            <div className="text-[10px] text-portal-muted">Company-wide activity</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {nav.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => setView(n.id)}
              className={`nav-tab ${view === n.id ? "nav-tab-active" : ""}`}
            >
              <span className="nav-tab-bar" />
              <n.icon size={14} className="nav-tab-icon" />
              <span className="nav-tab-label">{n.label}</span>
              {n.id === "alerts" && unread > 0 && (
                <span className="ml-auto rounded-full bg-portal-invert px-1.5 text-[10px] text-portal-invert-text">
                  {unread}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="border-t border-portal-border p-3">
          <div className="rounded-2xl border border-portal-border bg-portal-muted-bg p-3">
            <div className="text-[13px] font-semibold">{sessionUser.full_name}</div>
            <div className="mt-0.5 font-mono text-[10px] text-portal-muted">{sessionUser.email}</div>
            <div className="mt-1 text-[10px] text-portal-muted">
              Admin · {connected ? "API up" : "API down"}
            </div>
          </div>
          <div className="mt-2">
            <ThemeToggle />
          </div>
          <button
            type="button"
            onClick={() => navigate("/choose-team")}
            className="mt-2 flex w-full items-center justify-center rounded-xl border border-portal-border py-2 text-xs text-portal-muted hover:bg-portal-muted-bg"
          >
            Switch workspace
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-portal-border py-2 text-xs text-portal-muted hover:bg-portal-muted-bg"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-portal-bg">
        <header className="flex items-center justify-between border-b border-portal-border px-5 py-3">
          <div>
            <div className="font-display text-sm font-semibold capitalize">{view.replace("_", " ")}</div>
            <div className="text-[11px] text-portal-muted">Every team, task, chat, and user in one place</div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle compact />
            <button
              type="button"
              onClick={() => load()}
              className="flex items-center gap-1.5 rounded-xl border border-portal-border px-3 py-1.5 text-xs text-portal-muted hover:bg-portal-muted-bg"
            >
              <RefreshCw size={12} className={busy ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </header>

        {error && (
          <div className="mx-5 mt-3 rounded-xl border border-portal-danger-border bg-portal-danger-bg px-3 py-2 text-xs text-portal-danger">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5">
          {view === "activity" && (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  { label: "People", value: stats.users || users.length },
                  { label: "Chats", value: stats.conversations || chats.length },
                  { label: "Messages", value: stats.messages },
                  { label: "Tasks", value: tasks.length },
                  { label: "Open alerts", value: stats.open_alerts || unread },
                ].map((c) => (
                  <div key={c.label} className="rounded-2xl border border-portal-border bg-portal-card p-4">
                    <div className="text-[11px] uppercase tracking-wide text-portal-muted">{c.label}</div>
                    <div className="font-display mt-2 text-3xl font-semibold">{c.value}</div>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-2xl border border-portal-border bg-portal-card p-4">
                  <div className="mb-3 text-sm font-semibold">Recent chats</div>
                  <div className="space-y-2">
                    {chats.slice(0, 8).map((chat) => (
                      <button
                        key={chat.id}
                        type="button"
                        onClick={() => {
                          setView("chats");
                          openChat(chat.id);
                        }}
                        className="block w-full rounded-xl border border-portal-border px-3 py-2 text-left text-xs hover:border-portal-invert"
                      >
                        <div className="flex justify-between gap-2">
                          <span className="font-medium">{chat.user_name || chat.user_email}</span>
                          <span className="text-portal-muted">{chat.user_department}</span>
                        </div>
                        <div className="mt-1 truncate text-portal-muted">{chat.last_preview || chat.title}</div>
                        <div className="mt-1 text-[10px] text-portal-muted">
                          {chat.message_count} msgs · {fmt(chat.updated_at)}
                        </div>
                      </button>
                    ))}
                    {!chats.length && <p className="text-xs text-portal-muted">No chats yet</p>}
                  </div>
                </section>

                <section className="rounded-2xl border border-portal-border bg-portal-card p-4">
                  <div className="mb-3 text-sm font-semibold">Recent queries</div>
                  <div className="space-y-2">
                    {queries.slice(0, 8).map((q) => (
                      <div key={q.id} className="rounded-xl border border-portal-border px-3 py-2 text-xs">
                        <div className="flex justify-between gap-2">
                          <span className="font-medium">{q.user_email}</span>
                          <span className="text-portal-muted">{q.user_department}</span>
                        </div>
                        <div className="mt-1 text-portal-muted">{q.query}</div>
                        <div className="mt-1 text-[10px] text-portal-muted">
                          {q.latency_ms} ms · {fmt(q.created_at)}
                        </div>
                      </div>
                    ))}
                    {!queries.length && <p className="text-xs text-portal-muted">No query log yet</p>}
                  </div>
                </section>
              </div>

              <section className="rounded-2xl border border-portal-border bg-portal-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Shield size={16} />
                  <span className="text-sm font-medium">Knowledge ingest</span>
                  <div className="ml-auto flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => ingest("docs")}
                      className="rounded-xl border border-portal-border px-3 py-1.5 text-xs font-semibold text-portal-text hover:bg-portal-muted-bg"
                    >
                      Ingest docs
                    </button>
                    <button
                      type="button"
                      onClick={() => ingest("acmetech")}
                      className="rounded-xl bg-portal-invert px-3 py-1.5 text-xs font-semibold text-portal-invert-text"
                    >
                      Ingest AcmeTech
                    </button>
                    <a
                      href="/docs"
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-portal-border px-3 py-1.5 text-xs text-portal-muted hover:bg-portal-muted-bg"
                    >
                      API docs
                    </a>
                  </div>
                </div>
                {ingestMsg && <p className="mt-2 text-xs text-portal-muted">{ingestMsg}</p>}
              </section>
            </div>
          )}

          {view === "teams" && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {teams.map((team) => {
                const teamTasks = tasks.filter((t) => t.team_id === team.id);
                return (
                  <div key={team.id} className="rounded-2xl border border-portal-border bg-portal-card p-4">
                    <div className="font-medium">{team.name}</div>
                    <div className="mt-1 text-xs text-portal-muted">{team.description || team.department_key}</div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-portal-muted">
                      <div>Members · {memberCounts[team.id] || 0}</div>
                      <div>Tasks · {teamTasks.length}</div>
                      <div>To do · {teamTasks.filter((t) => t.status === "todo").length}</div>
                      <div>Done · {teamTasks.filter((t) => t.status === "done").length}</div>
                    </div>
                  </div>
                );
              })}
              {!teams.length && <p className="text-sm text-portal-muted">No teams yet</p>}
            </div>
          )}

          {view === "tasks" && (
            <div>
              <div className="mb-4 flex flex-wrap gap-2 text-xs text-portal-muted">
                <span>To do {taskCounts.todo}</span>
                <span>·</span>
                <span>In progress {taskCounts.in_progress}</span>
                <span>·</span>
                <span>Done {taskCounts.done}</span>
              </div>
              <div className="overflow-hidden rounded-2xl border border-portal-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-portal-muted-bg text-portal-muted">
                    <tr>
                      <th className="px-3 py-2">Task</th>
                      <th className="px-3 py-2">Team</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => (
                      <tr key={task.id} className="border-t border-portal-border">
                        <td className="px-3 py-2">
                          <div className="font-medium">{task.title}</div>
                          {task.description && <div className="mt-0.5 text-portal-muted">{task.description}</div>}
                        </td>
                        <td className="px-3 py-2">{teamName(task.team_id)}</td>
                        <td className="px-3 py-2">
                          {TASK_STATUSES.find((s) => s.id === task.status)?.label || task.status}
                        </td>
                        <td className="px-3 py-2 text-portal-muted">{fmt(task.updated_at || task.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!tasks.length && <p className="p-6 text-center text-xs text-portal-muted">No tasks across teams</p>}
              </div>
            </div>
          )}

          {view === "people" && (
            <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
              <div className="overflow-hidden rounded-2xl border border-portal-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-portal-muted-bg text-portal-muted">
                    <tr>
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Email</th>
                      <th className="px-3 py-2 font-medium">Dept</th>
                      <th className="px-3 py-2 font-medium">Clearance</th>
                      <th className="px-3 py-2 font-medium">Admin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-t border-portal-border">
                        <td className="px-3 py-2">{u.full_name}</td>
                        <td className="px-3 py-2 font-mono text-[10px]">{u.email}</td>
                        <td className="px-3 py-2">{u.department}</td>
                        <td className="px-3 py-2">{CLEARANCE_LABEL[u.clearance_level] || u.clearance_level}</td>
                        <td className="px-3 py-2">{u.is_admin ? "yes" : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <form onSubmit={createUser} className="rounded-2xl border border-portal-border bg-portal-card p-4">
                <div className="mb-3 text-sm font-semibold">Create user</div>
                <input
                  required
                  placeholder="Full name"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  className="mb-2 w-full rounded-xl border border-portal-border bg-portal-bg px-3 py-2 text-xs outline-none"
                />
                <input
                  required
                  type="email"
                  placeholder="Email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="mb-2 w-full rounded-xl border border-portal-border bg-portal-bg px-3 py-2 text-xs outline-none"
                />
                <input
                  required
                  type="password"
                  minLength={6}
                  placeholder="Password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="mb-2 w-full rounded-xl border border-portal-border bg-portal-bg px-3 py-2 text-xs outline-none"
                />
                <select
                  value={newUser.department}
                  onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                  className="mb-2 w-full rounded-xl border border-portal-border bg-portal-bg px-3 py-2 text-xs outline-none"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
                <select
                  value={newUser.clearance_level}
                  onChange={(e) => setNewUser({ ...newUser, clearance_level: Number(e.target.value) })}
                  className="mb-2 w-full rounded-xl border border-portal-border bg-portal-bg px-3 py-2 text-xs outline-none"
                >
                  <option value={1}>L1 Intern</option>
                  <option value={2}>L2 Member</option>
                  <option value={3}>L3 Manager</option>
                </select>
                <label className="mb-3 flex items-center gap-2 text-xs text-portal-muted">
                  <input
                    type="checkbox"
                    checked={newUser.is_admin}
                    onChange={(e) => setNewUser({ ...newUser, is_admin: e.target.checked })}
                  />
                  Admin
                </label>
                <button type="submit" className="w-full rounded-xl bg-portal-invert py-2 text-xs font-semibold text-portal-invert-text">
                  Create
                </button>
              </form>
            </div>
          )}

          {view === "chats" && (
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="space-y-2">
                {chats.map((chat) => (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => openChat(chat.id)}
                    className={`block w-full rounded-2xl border px-3 py-3 text-left text-xs ${
                      openChatId === chat.id ? "border-portal-invert bg-portal-card" : "border-portal-border bg-portal-card"
                    }`}
                  >
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">{chat.title || `Chat #${chat.id}`}</span>
                      <span className="text-portal-muted">{chat.message_count}</span>
                    </div>
                    <div className="mt-1 text-portal-muted">
                      {chat.user_name || chat.user_email} · {chat.user_department}
                    </div>
                    <div className="mt-1 truncate text-portal-muted">{chat.last_preview}</div>
                    <div className="mt-1 text-[10px] text-portal-muted">{fmt(chat.updated_at)}</div>
                  </button>
                ))}
                {!chats.length && <p className="text-sm text-portal-muted">No company chats yet</p>}
              </div>
              <div className="rounded-2xl border border-portal-border bg-portal-card p-4">
                {!openChatId && <p className="text-sm text-portal-muted">Select a chat to read the full thread</p>}
                {openBusy && <p className="text-sm text-portal-muted">Loading…</p>}
                {openChatId && !openBusy && (
                  <div className="space-y-3">
                    {openMsgs.map((m) => (
                      <div
                        key={String(m.id)}
                        className={`rounded-xl px-3 py-2 text-sm ${
                          m.role === "user"
                            ? "bg-portal-invert text-portal-invert-text"
                            : "border border-portal-border bg-portal-muted-bg"
                        }`}
                      >
                        <div className="mb-1 text-[10px] uppercase tracking-wide opacity-70">{m.role}</div>
                        {m.role === "user" ? m.content : <ReactMarkdown className="prose-portal">{m.content}</ReactMarkdown>}
                      </div>
                    ))}
                    {!openMsgs.length && <p className="text-xs text-portal-muted">Empty conversation</p>}
                  </div>
                )}
              </div>
            </div>
          )}

          {view === "documents" && (
            <div className="overflow-x-auto overflow-hidden rounded-2xl border border-portal-border">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="bg-portal-muted-bg text-portal-muted">
                  <tr>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Folder</th>
                    <th className="px-3 py-2">Depts</th>
                    <th className="px-3 py-2">Min L</th>
                    <th className="px-3 py-2">Wide</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Chunks</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {docs.map((d) => (
                    <tr key={d.id} className="border-t border-portal-border">
                      <td className="px-3 py-2">{d.title}</td>
                      <td className="px-3 py-2">{d.department_folder}</td>
                      <td className="px-3 py-2">
                        <input
                          value={d.allowed_departments.join(", ")}
                          onChange={(e) =>
                            setDocs((rows) =>
                              rows.map((row) =>
                                row.id === d.id
                                  ? {
                                      ...row,
                                      allowed_departments: e.target.value
                                        .split(",")
                                        .map((s) => s.trim())
                                        .filter(Boolean),
                                    }
                                  : row
                              )
                            )
                          }
                          className="w-40 rounded-lg border border-portal-border bg-portal-bg px-2 py-1 outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={d.min_clearance}
                          onChange={(e) =>
                            setDocs((rows) =>
                              rows.map((row) =>
                                row.id === d.id ? { ...row, min_clearance: Number(e.target.value) } : row
                              )
                            )
                          }
                          className="rounded-lg border border-portal-border bg-portal-bg px-2 py-1 outline-none"
                        >
                          <option value={1}>1</option>
                          <option value={2}>2</option>
                          <option value={3}>3</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={d.company_wide}
                          onChange={(e) =>
                            setDocs((rows) =>
                              rows.map((row) =>
                                row.id === d.id ? { ...row, company_wide: e.target.checked } : row
                              )
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2">{d.status}</td>
                      <td className="px-3 py-2">{d.chunk_count}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => saveDocAcl(d)}
                          className="rounded-lg border border-portal-border px-2 py-1 hover:bg-portal-muted-bg"
                        >
                          Save ACL
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!docs.length && <p className="p-6 text-center text-xs text-portal-muted">No documents — run ingest</p>}
            </div>
          )}

          {view === "alerts" && (
            <div>
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-xs text-portal-muted">
                  Cross-team doc probes and restricted access attempts. Review and acknowledge.
                </p>
                <button
                  type="button"
                  onClick={ackAll}
                  className="rounded-xl border border-portal-border px-3 py-1.5 text-xs text-portal-muted hover:bg-portal-muted-bg"
                >
                  Ack all
                </button>
              </div>
              <div className="space-y-2">
                {alerts.map((a) => (
                  <div
                    key={a.id}
                    className={`rounded-2xl border p-4 text-xs ${
                      a.acknowledged
                        ? "border-portal-border bg-portal-card"
                        : "border-portal-warn/40 bg-portal-card"
                    }`}
                  >
                    <div className="flex flex-wrap items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-portal-warn">
                          Admin activity alert
                        </div>
                        <div className="mt-1 font-medium">
                          {a.user_email} · team {a.user_department} · L{a.user_clearance}
                        </div>
                        <div className="mt-1 text-portal-muted">Asked: {a.query}</div>
                        <div className="mt-1 text-[10px] text-portal-warn">{a.mentioned_documents}</div>
                        <div className="mt-1 text-[10px] text-portal-muted">{fmt(a.created_at)}</div>
                      </div>
                      {!a.acknowledged ? (
                        <button
                          type="button"
                          onClick={() => ack(a.id)}
                          className="flex items-center gap-1 rounded-lg border border-portal-border px-2 py-1"
                        >
                          <CheckCircle2 size={12} /> Ack
                        </button>
                      ) : (
                        <span className="text-[10px] text-portal-muted">acked</span>
                      )}
                    </div>
                  </div>
                ))}
                {!alerts.length && <p className="text-center text-xs text-portal-muted">No alerts</p>}
              </div>
            </div>
          )}

          {view === "assistant" && (
            <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="font-display text-sm font-semibold">Admin assistant</div>
                  <p className="text-xs text-portal-muted">
                    Searches every knowledge doc first. If nothing matches, answers briefly as general help. Team privacy still applies for non-admins.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setChatMsgs([]);
                    setChatId(null);
                    setStreaming("");
                    setQuestion("");
                  }}
                  className="shrink-0 rounded-xl border border-portal-border px-3 py-1.5 text-xs text-portal-muted hover:bg-portal-muted-bg"
                >
                  New chat
                </button>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-portal-border bg-portal-card p-4">
                {!chatMsgs.length && !streaming && (
                  <div className="space-y-3 py-6 text-center">
                    <p className="text-sm text-portal-muted">Ask anything company-wide — or a short general question.</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {[
                        "What is User Access & Permission Management?",
                        "Summarize the administrator guide",
                        "What is in the validation pack?",
                        "What is RAG?",
                      ].map((s) => (
                        <button
                          key={s}
                          type="button"
                          disabled={chatBusy}
                          onClick={() => sendChat(s)}
                          className="rounded-full border border-portal-border px-3 py-1.5 text-left text-[11px] text-portal-muted hover:border-portal-invert hover:text-portal-text"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {chatMsgs.map((m) => (
                  <div
                    key={String(m.id)}
                    className={`rounded-2xl px-3 py-2 text-sm ${
                      m.role === "user"
                        ? "ml-8 bg-portal-invert text-portal-invert-text"
                        : "mr-8 border border-portal-border bg-portal-muted-bg"
                    }`}
                  >
                    {m.role === "user" ? (
                      m.content
                    ) : (
                      <>
                        <ReactMarkdown className="prose-portal">{m.content}</ReactMarkdown>
                        {!!m.followups?.length && (
                          <div className="mt-2 border-t border-portal-border pt-2">
                            <div className="mb-1 text-[10px] uppercase tracking-wide text-portal-muted">Explore more</div>
                            <div className="space-y-1">
                              {m.followups.slice(0, 2).map((q) => (
                                <button
                                  key={q}
                                  type="button"
                                  disabled={chatBusy}
                                  onClick={() => sendChat(q)}
                                  className="block w-full truncate rounded-lg border border-portal-border px-2 py-1.5 text-left text-[11px] text-portal-muted hover:border-portal-invert hover:text-portal-text"
                                >
                                  {q}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
                {streaming && (
                  <div className="mr-8 rounded-2xl border border-portal-border bg-portal-muted-bg px-3 py-2 text-sm">
                    <ReactMarkdown className="prose-portal">{streaming}</ReactMarkdown>
                  </div>
                )}
                {chatBusy && !streaming && <div className="text-[11px] text-portal-muted">Thinking…</div>}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendChat()}
                  placeholder="Ask across all company docs…"
                  className="flex-1 rounded-2xl border border-portal-border bg-portal-muted-bg px-4 py-2.5 text-sm outline-none focus:border-portal-invert"
                />
                <button
                  type="button"
                  disabled={chatBusy || !question.trim()}
                  onClick={() => void sendChat()}
                  className="grid h-11 w-11 place-items-center rounded-2xl bg-portal-invert text-portal-invert-text disabled:opacity-40 pressable"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
