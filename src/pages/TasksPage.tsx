import { FormEvent, useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { createTask, deleteTask, listTasks, updateTaskStatus } from "../lib/portalApi";
import type { PortalTask, TaskStatus } from "../lib/portalTypes";
import { TASK_STATUSES } from "../lib/portalTypes";
import { getActiveTeamId } from "../lib/storage";

export default function TasksPage() {
  const { supabaseUser, supabaseConfigured } = useAuth();
  const teamId = getActiveTeamId();
  const [tasks, setTasks] = useState<PortalTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    if (!teamId) return;
    const rows = await listTasks(teamId);
    setTasks(rows);
  }

  useEffect(() => {
    if (!teamId) {
      setLoading(false);
      return;
    }
    refresh()
      .catch((e) => {
        const msg = String(e?.message || "");
        if (msg.toLowerCase().includes("schema cache") || msg.toLowerCase().includes("could not find the table")) {
          setTasks([]);
        } else {
          setError(e?.message || "Failed to load tasks");
        }
      })
      .finally(() => setLoading(false));
  }, [teamId]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!teamId || !supabaseUser || !title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createTask({
        team_id: teamId,
        title,
        description,
        created_by: supabaseUser.id,
      });
      setTitle("");
      setDescription("");
      await refresh();
    } catch (err: any) {
      setError(err?.message || "Failed to create task");
    } finally {
      setBusy(false);
    }
  }

  async function onStatusChange(taskId: string, status: TaskStatus) {
    try {
      await updateTaskStatus(taskId, status);
      await refresh();
    } catch (err: any) {
      setError(err?.message || "Failed to update task");
    }
  }

  async function onDelete(taskId: string) {
    try {
      await deleteTask(taskId);
      await refresh();
    } catch (err: any) {
      setError(err?.message || "Failed to delete task");
    }
  }

  if (!supabaseConfigured) {
    return (
      <div className="p-6 text-sm text-portal-muted">
        Tasks require Supabase. Configure <code>VITE_SUPABASE_URL</code> and run{" "}
        <code>supabase/schema.sql</code> — see README.
      </div>
    );
  }

  if (!teamId) {
    return (
      <div className="p-6 text-sm text-portal-muted">No active team. Go to Teams to select one.</div>
    );
  }

  return (
    <div className="page-enter mx-auto max-w-4xl p-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Tasks</h1>
      <p className="mt-1 text-sm text-portal-muted">Team task board</p>

      {error && (
        <div className="mt-4 rounded-lg border border-portal-danger-border bg-portal-danger-bg px-3 py-2 text-sm text-portal-danger">{error}</div>
      )}

      <form onSubmit={onCreate} className="mt-6 rounded-xl border border-portal-border bg-portal-card p-4">
        <div className="text-sm font-medium">New task</div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
          className="mt-3 w-full rounded-lg border border-portal-border px-3 py-2 text-sm outline-none focus:border-portal-invert"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={2}
          className="mt-2 w-full rounded-lg border border-portal-border px-3 py-2 text-sm outline-none focus:border-portal-invert"
        />
        <button
          type="submit"
          disabled={busy || !title.trim()}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-portal-invert px-4 py-2 text-sm text-portal-invert-text disabled:opacity-50"
        >
          {busy ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
          Add task
        </button>
      </form>

      {loading ? (
        <div className="mt-8 flex justify-center text-portal-muted">
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {TASK_STATUSES.map((col) => (
            <div key={col.id} className="rounded-xl border border-portal-border bg-portal-muted-bg/50 p-3">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-portal-muted">{col.label}</div>
              <div className="space-y-2">
                {tasks
                  .filter((t) => t.status === col.id)
                  .map((task) => (
                    <div key={task.id} className="rounded-lg border border-portal-border bg-portal-card p-3">
                      <div className="text-sm font-medium">{task.title}</div>
                      {task.description && (
                        <div className="mt-1 text-xs text-portal-muted">{task.description}</div>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <select
                          value={task.status}
                          onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
                          className="rounded border border-portal-border px-2 py-1 text-[11px]"
                        >
                          {TASK_STATUSES.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => onDelete(task.id)}
                          className="rounded p-1 text-portal-muted hover:bg-portal-danger-bg hover:text-portal-danger"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                {tasks.filter((t) => t.status === col.id).length === 0 && (
                  <div className="rounded-lg border border-dashed border-portal-border px-3 py-6 text-center text-xs text-portal-muted">
                    No tasks
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
