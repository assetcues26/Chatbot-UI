import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { createTeam } from "../lib/portalApi";
import { DEPARTMENT_OPTIONS } from "../lib/portalTypes";
import type { DepartmentId } from "../lib/types";

export default function AddTeamPage() {
  const { supabaseUser, selectTeam } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [departmentKey, setDepartmentKey] = useState<DepartmentId>("engineering");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supabaseUser || !name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const team = await createTeam({
        name,
        description,
        department_key: departmentKey,
        userId: supabaseUser.id,
      });
      await selectTeam(team.id, team.name, departmentKey);
      navigate("/", { replace: true });
    } catch (err: any) {
      setError(err?.message || "Failed to create team");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg p-6">
      <Link to="/teams" className="inline-flex items-center gap-1 text-sm text-portal-muted hover:text-portal-text">
        <ArrowLeft size={14} /> Back to teams
      </Link>

      <h1 className="font-display mt-4 text-2xl font-semibold tracking-tight">Add team</h1>
      <p className="mt-1 text-sm text-portal-muted">Create a workspace for tasks and chat ACL mapping.</p>

      {error && (
        <div className="mt-4 rounded-lg border border-portal-danger-border bg-portal-danger-bg px-3 py-2 text-sm text-portal-danger">{error}</div>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-xl border border-portal-border bg-portal-card p-4">
        <label className="block text-sm">
          <span className="font-medium">Team name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-portal-border px-3 py-2 outline-none focus:border-portal-invert"
            placeholder="e.g. Platform Squad"
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-portal-border px-3 py-2 outline-none focus:border-portal-invert"
            placeholder="What does this team work on?"
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium">Chat ACL department</span>
          <select
            value={departmentKey}
            onChange={(e) => setDepartmentKey(e.target.value as DepartmentId)}
            className="mt-1 w-full rounded-lg border border-portal-border px-3 py-2 outline-none focus:border-portal-invert"
          >
            {DEPARTMENT_OPTIONS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-portal-muted">
            Maps to document access in the knowledge chatbot.
          </span>
        </label>

        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-portal-invert py-2.5 text-sm text-portal-invert-text disabled:opacity-50 pressable"
        >
          {busy ? <Loader2 className="animate-spin" size={16} /> : null}
          Create team
        </button>
      </form>
    </div>
  );
}
