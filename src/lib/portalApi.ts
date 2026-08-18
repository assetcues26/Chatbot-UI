import { requireSupabase } from "./supabase";
import type { PortalProfile, PortalTask, PortalTeam, TaskStatus } from "./portalTypes";
import { FALLBACK_TEAMS, slugify, withAdminTeam } from "./portalTypes";
import {
  createLocalTask,
  createLocalTeam,
  deleteLocalTask,
  loadAllLocalTasks,
  loadLocalTasks,
  loadLocalTeams,
  updateLocalTaskStatus,
} from "./portalLocal";
import type { DepartmentId } from "./types";

function isMissingTable(message?: string | null): boolean {
  const msg = (message || "").toLowerCase();
  return msg.includes("schema cache") || msg.includes("could not find the table") || msg.includes("does not exist");
}

export async function getProfile(userId: string): Promise<PortalProfile | null> {
  const sb = requireSupabase();
  const { data, error } = await sb.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) {
    if (isMissingTable(error.message)) return null;
    throw new Error(error.message);
  }
  return data as PortalProfile | null;
}

export async function updateProfile(
  userId: string,
  patch: Partial<
    Pick<PortalProfile, "full_name" | "default_team_id" | "job_title" | "office" | "clearance_level">
  >
) {
  const sb = requireSupabase();
  const { error } = await sb.from("profiles").update(patch).eq("id", userId);
  if (error && !isMissingTable(error.message)) throw new Error(error.message);
}

export async function getTeamBySlug(slug: string): Promise<PortalTeam | null> {
  const sb = requireSupabase();
  const { data, error } = await sb.from("teams").select("*").eq("slug", slug).maybeSingle();
  if (error) {
    if (isMissingTable(error.message)) {
      return [...FALLBACK_TEAMS, ...loadLocalTeams()].find((t) => t.slug === slug) || null;
    }
    throw new Error(error.message);
  }
  return data as PortalTeam | null;
}

/** Teams the current user belongs to */
export async function listMyTeams(): Promise<PortalTeam[]> {
  const sb = requireSupabase();
  const { data: memberships, error: memErr } = await sb.from("team_members").select("team_id");
  if (memErr) {
    if (isMissingTable(memErr.message)) return mergeLocal(FALLBACK_TEAMS);
    throw new Error(memErr.message);
  }
  const ids = (memberships || []).map((m) => m.team_id);
  if (ids.length === 0) return mergeLocal([]);

  const { data, error } = await sb.from("teams").select("*").in("id", ids).order("name");
  if (error) {
    if (isMissingTable(error.message)) return mergeLocal(FALLBACK_TEAMS);
    throw new Error(error.message);
  }
  return mergeLocal((data || []) as PortalTeam[]);
}

/** All teams (for choose-team when user has no memberships yet) */
export async function listAllTeams(): Promise<PortalTeam[]> {
  const sb = requireSupabase();
  const { data, error } = await sb.from("teams").select("*").order("name");
  if (error) {
    if (isMissingTable(error.message)) return mergeLocal(FALLBACK_TEAMS);
    throw new Error(error.message);
  }
  const rows = (data || []) as PortalTeam[];
  return mergeLocal(rows.length > 0 ? rows : FALLBACK_TEAMS);
}

export async function getTeam(teamId: string): Promise<PortalTeam | null> {
  const sb = requireSupabase();
  const { data, error } = await sb.from("teams").select("*").eq("id", teamId).maybeSingle();
  if (error) {
    if (isMissingTable(error.message)) {
      return [...FALLBACK_TEAMS, ...loadLocalTeams()].find((t) => t.id === teamId) || null;
    }
    throw new Error(error.message);
  }
  return data as PortalTeam | null;
}

export async function joinTeam(teamId: string, userId: string, role: "owner" | "member" = "member") {
  const sb = requireSupabase();
  const { error } = await sb.from("team_members").upsert(
    { team_id: teamId, user_id: userId, role },
    { onConflict: "team_id,user_id" }
  );
  if (error && !isMissingTable(error.message)) throw new Error(error.message);
}

export async function createTeam(input: {
  name: string;
  description?: string;
  department_key: DepartmentId;
  userId: string;
}): Promise<PortalTeam> {
  const sb = requireSupabase();
  const baseSlug = slugify(input.name) || "team";
  let slug = baseSlug;
  let attempt = 0;
  while (attempt < 5) {
    const { data, error } = await sb
      .from("teams")
      .insert({
        name: input.name.trim(),
        slug,
        description: input.description?.trim() || null,
        department_key: input.department_key,
        created_by: input.userId,
      })
      .select("*")
      .single();
    if (!error && data) {
      await joinTeam(data.id, input.userId, "owner");
      return data as PortalTeam;
    }
    if (isMissingTable(error?.message)) {
      return createLocalTeam(input);
    }
    if (error?.code !== "23505") throw new Error(error?.message || "Failed to create team");
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }
  throw new Error("Could not create team — slug conflict");
}

export async function listTeamMemberCounts(teamIds: string[]): Promise<Record<string, number>> {
  if (teamIds.length === 0) return {};
  const sb = requireSupabase();
  const { data, error } = await sb.from("team_members").select("team_id").in("team_id", teamIds);
  if (error) {
    if (isMissingTable(error.message)) return {};
    throw new Error(error.message);
  }
  const counts: Record<string, number> = {};
  for (const row of data || []) {
    counts[row.team_id] = (counts[row.team_id] || 0) + 1;
  }
  return counts;
}

export async function listTasks(teamId: string): Promise<PortalTask[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("tasks")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });
  if (error) {
    if (isMissingTable(error.message)) return loadLocalTasks(teamId);
    throw new Error(error.message);
  }
  return (data || []) as PortalTask[];
}

export async function createTask(input: {
  team_id: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  created_by: string;
  due_date?: string | null;
}): Promise<PortalTask> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("tasks")
    .insert({
      team_id: input.team_id,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      status: input.status || "todo",
      created_by: input.created_by,
      due_date: input.due_date || null,
    })
    .select("*")
    .single();
  if (error) {
    if (isMissingTable(error.message)) return createLocalTask(input);
    throw new Error(error.message);
  }
  return data as PortalTask;
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  const sb = requireSupabase();
  const { error } = await sb.from("tasks").update({ status }).eq("id", taskId);
  if (error) {
    if (isMissingTable(error.message)) {
      updateLocalTaskStatus(taskId, status);
      return;
    }
    throw new Error(error.message);
  }
}

export async function deleteTask(taskId: string) {
  const sb = requireSupabase();
  const { error } = await sb.from("tasks").delete().eq("id", taskId);
  if (error) {
    if (isMissingTable(error.message)) {
      deleteLocalTask(taskId);
      return;
    }
    throw new Error(error.message);
  }
}

export async function listAllTasks(): Promise<PortalTask[]> {
  const sb = requireSupabase();
  const { data, error } = await sb.from("tasks").select("*").order("created_at", { ascending: false });
  if (error) {
    if (isMissingTable(error.message)) return loadAllLocalTasks();
    throw new Error(error.message);
  }
  const remote = (data || []) as PortalTask[];
  const local = loadAllLocalTasks();
  const seen = new Set(remote.map((t) => t.id));
  return [...remote, ...local.filter((t) => !seen.has(t.id))];
}

export async function countTasksByStatus(teamId: string): Promise<Record<TaskStatus, number>> {
  const tasks = await listTasks(teamId);
  return {
    todo: tasks.filter((t) => t.status === "todo").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length,
  };
}

function mergeLocal(remote: PortalTeam[]): PortalTeam[] {
  const local = loadLocalTeams();
  const seen = new Set(remote.map((t) => t.id));
  return withAdminTeam([...remote, ...local.filter((t) => !seen.has(t.id))]);
}
