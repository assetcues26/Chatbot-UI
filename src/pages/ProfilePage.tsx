import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { CLEARANCE_LABEL } from "../lib/types";
import { getActiveTeamName } from "../lib/storage";

export default function ProfilePage() {
  const { profile, fastApiUser, supabaseUser, signOut } = useAuth();
  const teamName = getActiveTeamName();

  return (
    <div className="page-enter mx-auto max-w-lg p-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Profile</h1>
      <p className="mt-1 text-sm text-portal-muted">Your account details</p>

      <div className="mt-6 space-y-4 rounded-xl border border-portal-border bg-portal-card p-4 text-sm">
        <Row label="Name" value={profile?.full_name || fastApiUser?.full_name || "—"} />
        <Row label="Email" value={supabaseUser?.email || fastApiUser?.email || "—"} />
        <Row label="Job title" value={profile?.job_title || "—"} />
        <Row label="Office" value={profile?.office || "—"} />
        <Row label="Active team" value={teamName || "—"} />
        <Row
          label="Clearance"
          value={
            fastApiUser
              ? CLEARANCE_LABEL[fastApiUser.clearance_level] || `L${fastApiUser.clearance_level}`
              : "—"
          }
        />
        <Row label="Department (ACL)" value={fastApiUser?.department || "—"} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          to="/choose-team"
          className="rounded-lg border border-portal-border px-4 py-2 text-sm hover:bg-portal-muted-bg"
        >
          Switch team
        </Link>
        <button
          type="button"
          onClick={() => signOut()}
          className="rounded-lg bg-portal-invert px-4 py-2 text-sm text-portal-invert-text pressable"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-portal-border pb-3 last:border-0 last:pb-0">
      <span className="text-portal-muted">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
