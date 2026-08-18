/** Departments used by AssetCues FastAPI backend ACL */
export type DepartmentId = "engineering" | "sales" | "hr" | "finance" | "admin";

export type ClearanceLevel = 1 | 2 | 3;

export interface AuthUser {
  id: number;
  email: string;
  full_name: string;
  department: DepartmentId | string;
  clearance_level: number;
  is_admin: boolean;
}

/** UI-friendly alias kept for existing page props */
export type CompanyUser = AuthUser & {
  /** display helpers */
  name: string;
  team: string;
  clearance: string;
};

export interface Conversation {
  id: number;
  title: string;
  summary: string | null;
  pinned?: boolean;
  updated_at: string | null;
}

export interface Citation {
  document_id: number;
  title: string;
  department_folder: string;
  min_clearance: number;
}

export interface ChatMessage {
  id: number | string;
  role: "user" | "assistant" | "system";
  content: string;
  citations?: Citation[] | null;
  followups?: string[] | null;
  accessDenied?: boolean;
  restrictedHints?: Citation[];
}

export interface DocumentInfo {
  id: number;
  title: string;
  department_folder: string;
  allowed_departments: string[];
  min_clearance: number;
  company_wide: boolean;
  status: string;
  chunk_count: number;
}

export interface AccessAlert {
  id: number;
  user_email: string;
  user_department: string;
  user_clearance: number;
  query: string;
  mentioned_documents: string;
  acknowledged: boolean;
  created_at: string;
}

export interface StreamDoneEvent {
  type: "done";
  conversation_id: number;
  citations: Citation[];
  followups?: string[];
  latency_ms: number;
  restricted_hints?: Citation[];
  blocked_count?: number;
  access_denied?: boolean;
}

export const DEPARTMENTS: { id: DepartmentId; label: string; blurb: string }[] = [
  { id: "engineering", label: "Engineering", blurb: "Platform & product" },
  { id: "sales", label: "Sales", blurb: "Accounts & GTM" },
  { id: "hr", label: "HR", blurb: "People ops" },
  { id: "finance", label: "Finance", blurb: "Budget & capex" },
  { id: "admin", label: "Admin", blurb: "Company-wide control" },
];

export const CLEARANCE_LABEL: Record<number, string> = {
  1: "Intern (L1)",
  2: "Member (L2)",
  3: "Manager (L3)",
};

export function toCompanyUser(u: AuthUser): CompanyUser {
  return {
    ...u,
    name: u.full_name,
    team: u.department,
    clearance: CLEARANCE_LABEL[u.clearance_level] || `L${u.clearance_level}`,
  };
}

export const DEMO_USERS = [
  { email: "admin@assetcues.com", label: "Admin", dept: "engineering" },
  { email: "eng@assetcues.com", label: "Engineer", dept: "engineering" },
  { email: "intern.eng@assetcues.com", label: "Intern Eng", dept: "engineering" },
  { email: "sales@assetcues.com", label: "Sales", dept: "sales" },
  { email: "mgr.sales@assetcues.com", label: "Sales Mgr", dept: "sales" },
  { email: "hr.mgr@assetcues.com", label: "HR Mgr", dept: "hr" },
  { email: "finance@assetcues.com", label: "Finance", dept: "finance" },
] as const;
