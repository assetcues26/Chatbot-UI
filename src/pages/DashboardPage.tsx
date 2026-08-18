import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MessageSquare, Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { countTasksByStatus, listMyTeams } from "@/lib/portalApi";
import { getActiveTeamId, getActiveTeamName } from "@/lib/storage";

export default function DashboardPage() {
  const { fastApiUser, profile } = useAuth();
  const [counts, setCounts] = useState({ todo: 0, in_progress: 0, done: 0 });
  const [teamCount, setTeamCount] = useState(0);
  const teamId = getActiveTeamId();
  const teamName = getActiveTeamName();

  useEffect(() => {
    if (!teamId) return;
    countTasksByStatus(teamId).then(setCounts).catch(() => undefined);
  }, [teamId]);

  useEffect(() => {
    listMyTeams()
      .then((t) => setTeamCount(t.length))
      .catch(() => undefined);
  }, []);

  const name = profile?.full_name || fastApiUser?.full_name || "there";

  return (
    <div className="page-enter mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-semibold tracking-tight text-portal-text">Welcome, {name}</h1>
      <p className="mt-1 text-sm text-portal-muted">
        {teamName ? `Working in ${teamName}` : "Select a team to get started"}
        {teamCount ? ` · ${teamCount} team${teamCount === 1 ? "" : "s"}` : ""}
      </p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-portal-muted">
        <span className="glass rounded-full px-3 py-1">To do {counts.todo}</span>
        <span className="glass rounded-full px-3 py-1">In progress {counts.in_progress}</span>
        <span className="glass rounded-full px-3 py-1">Done {counts.done}</span>
        <Link to="/tasks" className="glass-strong inline-flex items-center gap-1 rounded-full px-3 py-1 text-portal-text hover:bg-white/20">
          Tasks <ArrowRight size={12} />
        </Link>
        <Link to="/teams/new" className="glass inline-flex items-center gap-1 rounded-full px-3 py-1 hover:bg-white/15">
          <Plus size={12} /> Add team
        </Link>
      </div>

      <Link
        to="/chat"
        className="glass mt-8 flex items-center justify-between rounded-2xl p-5 transition hover:bg-white/10"
      >
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-portal-text">
            <MessageSquare size={16} />
            Chat
          </div>
          <p className="mt-1 text-xs text-portal-muted">
            Ask the assistant across your team knowledge — same as Admin chat, on its own tab.
          </p>
        </div>
        <ArrowRight size={16} className="text-portal-muted" />
      </Link>
    </div>
  );
}
