import { getProfile, getTeamBySlug, joinTeam, listAllTeams, listMyTeams, updateProfile } from "./portalApi";
import { FALLBACK_TEAMS, type PortalTeam } from "./portalTypes";
import { clearSignupDraft, loadSignupDraft } from "./signupDraft";
import type { CompanyUser } from "./types";

export async function finishAuthAndEnter(opts: {
  userId: string;
  selectTeam: (teamId: string, teamName: string, departmentKey?: string) => Promise<CompanyUser>;
}): Promise<{ user: CompanyUser } | { needTeam: true }> {
  const draft = loadSignupDraft();
  let profile = null;
  let mine: PortalTeam[] = [];
  let allTeams: PortalTeam[] = [];

  try {
    profile = await getProfile(opts.userId);
  } catch {
    profile = null;
  }
  try {
    mine = await listMyTeams();
  } catch {
    mine = [];
  }
  try {
    allTeams = await listAllTeams();
  } catch {
    allTeams = [];
  }

  let team: PortalTeam | null = null;

  if (draft?.teamSlug) {
    try {
      team = await getTeamBySlug(draft.teamSlug);
    } catch {
      team = allTeams.find((t) => t.slug === draft.teamSlug) || null;
    }
  }
  if (!team && profile?.default_team_id) {
    team = mine.find((t) => t.id === profile.default_team_id) || allTeams.find((t) => t.id === profile.default_team_id) || null;
  }
  if (!team && mine.length === 1) {
    team = mine[0];
  }
  if (!team && allTeams.length === 1) {
    team = allTeams[0];
  }
  if (!team && draft?.teamSlug) {
    team = FALLBACK_TEAMS.find((t) => t.slug === draft.teamSlug) || null;
  }

  if (draft && profile) {
    try {
      await updateProfile(opts.userId, {
        full_name: draft.fullName.trim(),
        job_title: draft.jobTitle,
        office: draft.office,
        clearance_level: draft.clearanceLevel,
        default_team_id: team?.id || profile.default_team_id,
      });
    } catch {
      /* profile columns may be missing until schema is applied */
    }
  }

  if (!team) {
    return { needTeam: true };
  }

  try {
    await joinTeam(team.id, opts.userId);
  } catch {
    /* already a member or RLS not ready */
  }
  if (profile) {
    try {
      await updateProfile(opts.userId, { default_team_id: team.id });
    } catch {
      /* ignore */
    }
  }

  try {
    const user = await opts.selectTeam(team.id, team.name, String(team.department_key));
    clearSignupDraft();
    return { user };
  } catch {
    return { needTeam: true };
  }
}

export function authErrorMessage(err: unknown): string {
  const raw = err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : String(err || "");
  const msg = raw.toLowerCase();
  if (msg.includes("schema cache") || msg.includes("could not find the table")) {
    return "Supabase tables are missing. Open the SQL Editor, paste supabase/schema.sql, and run it. Then log in again.";
  }
  if (msg.includes("email not confirmed")) {
    return "Confirm your email first, or turn off Confirm email in Supabase Auth → Providers → Email.";
  }
  if (msg.includes("invalid login credentials")) {
    return "Wrong email or password. If you just signed up, use the same email and password.";
  }
  if (msg.includes("user already registered")) {
    return "This email already has an account. Log in instead.";
  }
  return raw || "Something went wrong";
}
