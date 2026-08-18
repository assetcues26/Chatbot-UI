import type { DepartmentId } from "./types";

export interface SignupDraft {
  fullName: string;
  teamSlug: DepartmentId;
  clearanceLevel: 1 | 2 | 3;
  jobTitle: string;
  office: string;
}

const KEY = "assetcues:signup-draft";

export function saveSignupDraft(draft: SignupDraft) {
  localStorage.setItem(KEY, JSON.stringify(draft));
}

export function loadSignupDraft(): SignupDraft | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SignupDraft) : null;
  } catch {
    return null;
  }
}

export function clearSignupDraft() {
  localStorage.removeItem(KEY);
}

export function isSignupDraftComplete(draft: SignupDraft | null): draft is SignupDraft {
  return Boolean(draft?.fullName.trim() && draft.teamSlug && draft.jobTitle && draft.office);
}

const PENDING_LOGIN_KEY = "assetcues:pending-login";

export function markPendingLoginAfterSignup() {
  localStorage.setItem(PENDING_LOGIN_KEY, "1");
}

export function consumePendingLoginAfterSignup(): boolean {
  const pending = localStorage.getItem(PENDING_LOGIN_KEY) === "1";
  if (pending) localStorage.removeItem(PENDING_LOGIN_KEY);
  return pending;
}
