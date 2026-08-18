import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { listAllTeams, listMyTeams, listTeamMemberCounts } from "../lib/portalApi";
import { FALLBACK_TEAMS, isAdminTeam, withAdminTeam, type PortalTeam } from "../lib/portalTypes";
import { getActiveTeamId } from "../lib/storage";

export default function TeamsPage() {
  const { selectTeam, fastApiUser, supabaseConfigured } = useAuth();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<PortalTeam[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeTeamId = getActiveTeamId();

  async function load() {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const mine = await listMyTeams();
      const all = mine.length > 0 ? mine : await listAllTeams();
      setTeams(withAdminTeam(all));
      try {
        setCounts(await listTeamMemberCounts(all.map((t) => t.id)));
      } catch {
        setCounts({});
      }
    } catch (e: any) {
      const msg = String(e?.message || "");
      if (msg.toLowerCase().includes("schema cache") || msg.toLowerCase().includes("could not find the table")) {
        setTeams(withAdminTeam(FALLBACK_TEAMS));
      } else {
        setError(e?.message || "Failed to load teams");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function switchTeam(team: PortalTeam) {
    setSwitching(team.id);
    setError(null);
    try {
      const user = await selectTeam(team.id, team.name, String(team.department_key));
      navigate(isAdminTeam(team) || user.is_admin ? "/admin" : "/", { replace: true });
    } catch (e: any) {
      setError(e?.message || "Failed to switch team");
    } finally {
      setSwitching(null);
    }
  }

  return (
    <div className="page-enter mx-auto max-w-4xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Teams</h1>
          <p className="mt-1 text-sm text-portal-muted">All your teams — switch or create new ones</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 rounded-lg border border-portal-border px-3 py-2 text-sm hover:bg-portal-muted-bg"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <Link
            to="/teams/new"
            className="inline-flex items-center gap-2 rounded-lg bg-portal-invert px-3 py-2 text-sm text-portal-invert-text"
          >
            <Plus size={14} /> Add team
          </Link>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-portal-danger-border bg-portal-danger-bg px-3 py-2 text-sm text-portal-danger">{error}</div>
      )}

      {!supabaseConfigured && (
        <div className="mt-6 rounded-lg border border-portal-border bg-portal-card p-4 text-sm text-portal-muted">
          Teams are stored in Supabase. Configure env vars and run the SQL schema to enable team management.
        </div>
      )}

      {loading ? (
        <div className="mt-10 flex justify-center text-portal-muted">
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : (
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {teams.map((team) => {
            const active = team.id === activeTeamId;
            return (
              <div
                key={team.id}
                className={`card-lift rounded-xl border bg-portal-card p-4 ${active ? "border-portal-invert" : "border-portal-border"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{team.name}</div>
                    <div className="mt-1 text-xs text-portal-muted">{team.description || team.department_key}</div>
                    <div className="mt-2 text-[11px] text-portal-muted">
                      ACL {team.department_key}
                      {counts[team.id] ? ` · ${counts[team.id]} member${counts[team.id] === 1 ? "" : "s"}` : ""}
                    </div>
                  </div>
                  {active && (
                    <span className="rounded-full bg-portal-invert px-2 py-0.5 text-[10px] text-portal-invert-text">Active</span>
                  )}
                </div>
                {!active && fastApiUser && (
                  <button
                    type="button"
                    disabled={switching === team.id}
                    onClick={() => switchTeam(team)}
                    className="mt-3 text-xs font-medium underline underline-offset-2 disabled:opacity-50"
                  >
                    {switching === team.id ? "Switching…" : isAdminTeam(team) ? "Enter admin portal" : "Switch to this team"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
