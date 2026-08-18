import type { DepartmentId } from "./types";

export interface PortalProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  default_team_id: string | null;
  job_title: string | null;
  office: string | null;
  clearance_level: number;
  is_admin: boolean;
}

export interface PortalTeam {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  department_key: DepartmentId | string;
  created_by: string | null;
  created_at: string;
  member_count?: number;
}

export interface PortalTask {
  id: string;
  team_id: string;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "done";
  assignee_id: string | null;
  due_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = PortalTask["status"];

export const TASK_STATUSES: { id: TaskStatus; label: string }[] = [
  { id: "todo", label: "To do" },
  { id: "in_progress", label: "In progress" },
  { id: "done", label: "Done" },
];

export const FALLBACK_TEAMS: PortalTeam[] = [
  {
    id: "engineering",
    name: "Engineering",
    slug: "engineering",
    description: "Platform & product",
    department_key: "engineering",
    created_by: null,
    created_at: "",
  },
  {
    id: "sales",
    name: "Sales",
    slug: "sales",
    description: "Accounts & GTM",
    department_key: "sales",
    created_by: null,
    created_at: "",
  },
  {
    id: "hr",
    name: "HR",
    slug: "hr",
    description: "People ops",
    department_key: "hr",
    created_by: null,
    created_at: "",
  },
  {
    id: "finance",
    name: "Finance",
    slug: "finance",
    description: "Budget & capex",
    department_key: "finance",
    created_by: null,
    created_at: "",
  },
  {
    id: "admin",
    name: "Admin",
    slug: "admin",
    description: "Company-wide control — all teams, tasks, chats, and users",
    department_key: "admin",
    created_by: null,
    created_at: "",
  },
];

export function isAdminTeam(team: Pick<PortalTeam, "id" | "slug" | "department_key">) {
  return [team.id, team.slug, String(team.department_key)].some((v) => String(v).toLowerCase() === "admin");
}

export function withAdminTeam(teams: PortalTeam[]): PortalTeam[] {
  if (teams.some(isAdminTeam)) return teams;
  const admin = FALLBACK_TEAMS.find((t) => t.slug === "admin");
  return admin ? [admin, ...teams] : teams;
}

export const DEPARTMENT_OPTIONS: { id: DepartmentId; label: string }[] = [
  { id: "engineering", label: "Engineering" },
  { id: "sales", label: "Sales" },
  { id: "hr", label: "HR" },
  { id: "finance", label: "Finance" },
  { id: "admin", label: "Admin" },
];

export const ROLE_OPTIONS: { id: 1 | 2 | 3; label: string; hint: string }[] = [
  { id: 1, label: "Intern", hint: "L1 access" },
  { id: 2, label: "Member", hint: "L2 access" },
  { id: 3, label: "Manager", hint: "L3 access" },
];

export const OFFICE_OPTIONS = ["Pune HQ", "USA — Southlake", "Dubai"] as const;

export const JOB_TITLES: Record<DepartmentId, string[]> = {
  engineering: ["Software Engineer", "Frontend Engineer", "Backend Engineer", "DevOps", "Product Engineer"],
  sales: ["Account Executive", "Sales Rep", "Customer Success", "Partnerships"],
  hr: ["People Ops", "Recruiter", "HRBP", "Talent"],
  finance: ["Analyst", "Controller", "FP&A", "Payroll"],
  admin: ["Administrator", "Ops Lead", "IT Admin", "Security Admin"],
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export { slugify };
