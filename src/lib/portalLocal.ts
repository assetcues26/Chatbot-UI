import type { PortalTask, PortalTeam, TaskStatus } from "./portalTypes";

const TEAMS_KEY = "assetcues:local-teams";
const TASKS_KEY = "assetcues:local-tasks";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function loadLocalTeams(): PortalTeam[] {
  return readJson<PortalTeam[]>(TEAMS_KEY, []);
}

export function saveLocalTeam(team: PortalTeam) {
  const teams = loadLocalTeams().filter((t) => t.id !== team.id);
  teams.push(team);
  localStorage.setItem(TEAMS_KEY, JSON.stringify(teams));
}

export function createLocalTeam(input: {
  name: string;
  description?: string;
  department_key: string;
  userId: string;
}): PortalTeam {
  const slug = input.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "team";
  const team: PortalTeam = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    slug: `${slug}-${Date.now().toString(36)}`,
    description: input.description?.trim() || null,
    department_key: input.department_key,
    created_by: input.userId,
    created_at: new Date().toISOString(),
  };
  saveLocalTeam(team);
  return team;
}

export function loadAllLocalTasks(): PortalTask[] {
  return readJson<PortalTask[]>(TASKS_KEY, []);
}

export function loadLocalTasks(teamId: string): PortalTask[] {
  return loadAllLocalTasks().filter((t) => t.team_id === teamId);
}

export function upsertLocalTask(task: PortalTask) {
  const all = readJson<PortalTask[]>(TASKS_KEY, []);
  const next = all.filter((t) => t.id !== task.id);
  next.unshift(task);
  localStorage.setItem(TASKS_KEY, JSON.stringify(next));
}

export function createLocalTask(input: {
  team_id: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  created_by: string;
  due_date?: string | null;
}): PortalTask {
  const now = new Date().toISOString();
  const task: PortalTask = {
    id: crypto.randomUUID(),
    team_id: input.team_id,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    status: input.status || "todo",
    assignee_id: null,
    due_date: input.due_date || null,
    created_by: input.created_by,
    created_at: now,
    updated_at: now,
  };
  upsertLocalTask(task);
  return task;
}

export function updateLocalTaskStatus(taskId: string, status: TaskStatus) {
  const all = readJson<PortalTask[]>(TASKS_KEY, []);
  const next = all.map((t) => (t.id === taskId ? { ...t, status, updated_at: new Date().toISOString() } : t));
  localStorage.setItem(TASKS_KEY, JSON.stringify(next));
}

export function deleteLocalTask(taskId: string) {
  const all = readJson<PortalTask[]>(TASKS_KEY, []);
  localStorage.setItem(TASKS_KEY, JSON.stringify(all.filter((t) => t.id !== taskId)));
}
