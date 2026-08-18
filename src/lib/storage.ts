import type { CompanyUser } from "./types";

const TOKEN_KEY = "assetcues:jwt";
const SESSION_KEY = "assetcues:member-session";
const THEME_KEY = "assetcues:theme";
const ACTIVE_TEAM_KEY = "assetcues:active-team-id";
const ACTIVE_TEAM_NAME_KEY = "assetcues:active-team-name";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function loadMemberSession(): CompanyUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as CompanyUser) : null;
  } catch {
    return null;
  }
}

export function saveMemberSession(user: CompanyUser) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function clearMemberSession() {
  localStorage.removeItem(SESSION_KEY);
  clearToken();
  clearActiveTeam();
}

export function setTheme(theme: "light" | "dark") {
  localStorage.setItem(THEME_KEY, theme);
}

export function getTheme(): "light" | "dark" {
  return (localStorage.getItem(THEME_KEY) as "light" | "dark") || "light";
}

export function getActiveTeamId(): string | null {
  return localStorage.getItem(ACTIVE_TEAM_KEY);
}

export function getActiveTeamName(): string | null {
  return localStorage.getItem(ACTIVE_TEAM_NAME_KEY);
}

export function setActiveTeam(id: string, name: string) {
  localStorage.setItem(ACTIVE_TEAM_KEY, id);
  localStorage.setItem(ACTIVE_TEAM_NAME_KEY, name);
}

export function clearActiveTeam() {
  localStorage.removeItem(ACTIVE_TEAM_KEY);
  localStorage.removeItem(ACTIVE_TEAM_NAME_KEY);
}
