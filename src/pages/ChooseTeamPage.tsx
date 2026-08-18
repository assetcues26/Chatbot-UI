import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, Shield } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { joinTeam, listAllTeams, listMyTeams, updateProfile } from "../lib/portalApi";
import { FALLBACK_TEAMS, isAdminTeam, withAdminTeam, type PortalTeam } from "../lib/portalTypes";
import ThemeToggle from "../components/ThemeToggle";
import { loadSignupDraft } from "../lib/signupDraft";

export default function ChooseTeamPage() {
  const { supabaseUser, selectTeam } = useAuth();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<PortalTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const mine = await listMyTeams();
        if (mine.length > 0) {
          setTeams(withAdminTeam(mine));
        } else {
          const all = await listAllTeams();
          setTeams(withAdminTeam(all.length > 0 ? all : FALLBACK_TEAMS));
          setUsingFallback(all.length === 0);
        }
      } catch {
        const draft = loadSignupDraft();
        const fallback = withAdminTeam(FALLBACK_TEAMS);
        setTeams(fallback);
        setUsingFallback(true);
        if (draft?.teamSlug) {
          const preferred = fallback.find((t) => t.slug === draft.teamSlug);
          if (preferred) {
            /* keep all teams visible; preferred is first */
            setTeams([preferred, ...fallback.filter((t) => t.id !== preferred.id)]);
          }
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function pickTeam(team: PortalTeam) {
    if (!supabaseUser) return;
    setBusyId(team.id);
    setError(null);
    try {
      try {
        await joinTeam(team.id, supabaseUser.id);
        await updateProfile(supabaseUser.id, { default_team_id: team.id });
      } catch {
        /* tables may not exist yet */
      }
      const user = await selectTeam(team.id, team.name, String(team.department_key));
      navigate(isAdminTeam(team) || user.is_admin ? "/admin" : "/", { replace: true });
    } catch (e: any) {
      setError(e?.message || "Could not join team");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="page-enter min-h-screen bg-portal-bg px-4 py-12 text-portal-text">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Choose your team</h1>
          <ThemeToggle compact />
        </div>
        <p className="mt-2 text-sm text-portal-muted">
          Pick a team workspace, or choose Admin to open the company control portal with all activity.
        </p>

        {usingFallback && (
          <p className="mt-4 text-xs text-portal-muted">
            Using built-in teams. Run <code>supabase/schema.sql</code> in the SQL Editor later to enable tasks and
            custom teams.
          </p>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-portal-danger-border bg-portal-danger-bg px-3 py-2 text-sm text-portal-danger">{error}</div>
        )}

        {loading ? (
          <div className="mt-10 flex justify-center text-portal-muted">
            <Loader2 className="animate-spin" size={24} />
          </div>
        ) : (
          <div className="stagger mt-8 grid gap-3 sm:grid-cols-2">
            {teams.map((team) => {
              const admin = isAdminTeam(team);
              return (
              <button
                key={team.id}
                type="button"
                disabled={busyId === team.id}
                onClick={() => pickTeam(team)}
                className={`card-lift group rounded-xl border bg-portal-card p-4 text-left transition hover:border-portal-invert disabled:opacity-60 ${
                  admin ? "border-portal-invert" : "border-portal-border"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 font-medium">
                      {admin && <Shield size={14} />}
                      {team.name}
                    </div>
                    <div className="mt-1 text-xs text-portal-muted">{team.description || team.department_key}</div>
                    {admin && (
                      <div className="mt-2 text-[10px] uppercase tracking-wide text-portal-muted">
                        Full company activity
                      </div>
                    )}
                  </div>
                  {busyId === team.id ? (
                    <Loader2 className="animate-spin text-portal-muted" size={16} />
                  ) : (
                    <ArrowRight size={16} className="text-portal-muted opacity-0 transition group-hover:opacity-100" />
                  )}
                </div>
              </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
