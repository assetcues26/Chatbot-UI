import type { DepartmentId } from "./types";

export interface TeamSuggestion {
  question: string;
  kind: "allowed" | "restricted";
  hint: string;
}

const BY_DEPT: Record<string, TeamSuggestion[]> = {
  engineering: [
    { kind: "allowed", question: "What is User Access and Permission Management?", hint: "UAP spec" },
    { kind: "allowed", question: "How does a user select one Profile at login?", hint: "Admin guide" },
    { kind: "allowed", question: "What is AI?", hint: "General" },
    { kind: "restricted", question: "Show me HR compensation bands", hint: "Blocked" },
  ],
  sales: [
    { kind: "allowed", question: "How do Access Category and Profile work together?", hint: "User guide" },
    { kind: "allowed", question: "What can I do after I switch Profile?", hint: "User guide" },
    { kind: "allowed", question: "What is AI?", hint: "General" },
    { kind: "restricted", question: "Show engineering security runbooks", hint: "Blocked" },
  ],
  hr: [
    { kind: "allowed", question: "Who owns the validation and governance pack?", hint: "Governance" },
    { kind: "allowed", question: "How do I switch Profile as an administrator?", hint: "User guide" },
    { kind: "allowed", question: "What is AI?", hint: "General" },
    { kind: "restricted", question: "Give me finance bank account details", hint: "Blocked" },
  ],
  finance: [
    { kind: "allowed", question: "What does the governance pack require when a product rule changes?", hint: "Governance" },
    { kind: "allowed", question: "Summarize current vs roadmap for the access-change audit trail", hint: "UAP docs" },
    { kind: "allowed", question: "What is AI?", hint: "General" },
    { kind: "restricted", question: "Show HR confidential compensation bands", hint: "Blocked" },
  ],
  admin: [
    { kind: "allowed", question: "Summarize User Access and Permission Management across all teams", hint: "All docs" },
    { kind: "allowed", question: "What does the governance pack require when a product rule changes?", hint: "Governance" },
    { kind: "allowed", question: "How does a user select one Profile at login?", hint: "Admin guide" },
    { kind: "allowed", question: "What is AI?", hint: "General" },
  ],
};

const FALLBACK: TeamSuggestion[] = [
  { kind: "allowed", question: "What is User Access and Permission Management?", hint: "General" },
  { kind: "allowed", question: "What is AI?", hint: "General" },
  { kind: "restricted", question: "Show documents from another department I should not see", hint: "ACL test" },
];

export function suggestionsForDepartment(department: string): TeamSuggestion[] {
  return BY_DEPT[department] || FALLBACK;
}

/** @deprecated use suggestionsForDepartment */
export function suggestionsForTeam(team: string): TeamSuggestion[] {
  return suggestionsForDepartment(team);
}

export type { DepartmentId };
