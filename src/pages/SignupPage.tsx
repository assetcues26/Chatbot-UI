import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2, Mail } from "lucide-react";
import { authErrorMessage } from "../lib/onboarding";
import { JOB_TITLES, OFFICE_OPTIONS, ROLE_OPTIONS } from "../lib/portalTypes";
import { requireSupabase, supabaseConfigured } from "../lib/supabase";
import { isSignupDraftComplete, markPendingLoginAfterSignup, saveSignupDraft, type SignupDraft } from "../lib/signupDraft";
import { DEPARTMENTS, type DepartmentId } from "../lib/types";
import ThemeToggle from "../components/ThemeToggle";
import BrandStage from "../components/BrandStage";
import AmbientField from "../components/AmbientField";

type Step = "details" | "account";

export default function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("details");
  const [fullName, setFullName] = useState("");
  const [teamSlug, setTeamSlug] = useState<DepartmentId>("engineering");
  const [clearanceLevel, setClearanceLevel] = useState<1 | 2 | 3>(2);
  const [jobTitle, setJobTitle] = useState(JOB_TITLES.engineering[0]);
  const [office, setOffice] = useState<string>(OFFICE_OPTIONS[0]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titles = useMemo(() => JOB_TITLES[teamSlug], [teamSlug]);

  function draft(): SignupDraft {
    return { fullName: fullName.trim(), teamSlug, clearanceLevel, jobTitle, office };
  }

  function goToAccount() {
    if (!fullName.trim()) {
      setError("Enter your name");
      return;
    }
    setError(null);
    saveSignupDraft(draft());
    setStep("account");
  }

  async function onGoogle() {
    if (!supabaseConfigured) return;
    saveSignupDraft(draft());
    markPendingLoginAfterSignup();
    setBusy(true);
    setError(null);
    try {
      const sb = requireSupabase();
      const { error: err } = await sb.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (err) throw err;
    } catch (e: any) {
      setError(e?.message || "Google sign up failed");
      setBusy(false);
    }
  }

  async function onEmail(e: FormEvent) {
    e.preventDefault();
    if (!supabaseConfigured) return;
    const payload = draft();
    if (!isSignupDraftComplete(payload)) {
      setError("Fill in your details first");
      setStep("details");
      return;
    }
    saveSignupDraft(payload);
    setBusy(true);
    setError(null);
    try {
      const sb = requireSupabase();
      const { data, error: err } = await sb.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: {
            full_name: payload.fullName,
            job_title: payload.jobTitle,
            office: payload.office,
            clearance_level: String(payload.clearanceLevel),
            team_slug: payload.teamSlug,
          },
        },
      });
      if (err) throw err;
      const identities = data.user?.identities;
      if (data.user && Array.isArray(identities) && identities.length === 0) {
        throw new Error("This email already has an account. Log in instead.");
      }
      await sb.auth.signOut();
      const params = new URLSearchParams({ registered: "1", email: email.trim() });
      navigate(`/login?${params.toString()}`, { replace: true });
    } catch (err: any) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!supabaseConfigured) {
    return (
      <AuthShell>
        <p className="rounded-lg border border-portal-warn-border bg-portal-warn-bg px-3 py-2 text-sm text-portal-warn">
          Supabase is not configured. Sign up needs <code>VITE_SUPABASE_URL</code> and{" "}
          <code>VITE_SUPABASE_ANON_KEY</code>.
        </p>
        <Link to="/login" className="mt-4 inline-block text-sm underline">
          Back to login
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <Link to="/login" className="inline-flex items-center gap-1 text-xs text-portal-muted hover:text-portal-text">
        <ArrowLeft size={12} /> Already have an account? Log in
      </Link>
      <h1 className="font-display mt-3 text-2xl font-semibold tracking-tight">Create account</h1>
      <p className="mt-1 text-sm text-portal-muted">
        {step === "details" ? "Tap options — this takes about 20 seconds." : "Finish with Google or email."}
      </p>

      <div className="mt-4 flex gap-2 text-[11px] text-portal-muted">
        <span className={step === "details" ? "font-semibold text-portal-text" : ""}>1 · You</span>
        <span>/</span>
        <span className={step === "account" ? "font-semibold text-portal-text" : ""}>2 · Sign up</span>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-portal-danger-border bg-portal-danger-bg px-3 py-2 text-sm text-portal-danger">{error}</div>
      )}

      {step === "details" ? (
        <div className="mt-6 space-y-5">
          <label className="block text-sm">
            <span className="font-medium">Full name</span>
            <input
              autoFocus
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Priya Sharma"
              className="mt-1 w-full rounded-xl border border-portal-border px-3 py-2.5 text-sm outline-none focus:border-portal-invert"
            />
          </label>

          <Field label="Team">
            <div className="mt-2 flex flex-wrap gap-2">
              {DEPARTMENTS.map((d) => (
                <Chip
                  key={d.id}
                  active={teamSlug === d.id}
                  onClick={() => {
                    setTeamSlug(d.id);
                    setJobTitle(JOB_TITLES[d.id][0]);
                  }}
                >
                  {d.label}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label="Role">
            <div className="mt-2 flex flex-wrap gap-2">
              {ROLE_OPTIONS.map((r) => (
                <Chip key={r.id} active={clearanceLevel === r.id} onClick={() => setClearanceLevel(r.id)}>
                  {r.label}
                  <span className="ml-1 text-[10px] opacity-60">{r.hint}</span>
                </Chip>
              ))}
            </div>
          </Field>

          <Field label="Job title">
            <div className="mt-2 flex flex-wrap gap-2">
              {titles.map((t) => (
                <Chip key={t} active={jobTitle === t} onClick={() => setJobTitle(t)}>
                  {t}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label="Office">
            <div className="mt-2 flex flex-wrap gap-2">
              {OFFICE_OPTIONS.map((o) => (
                <Chip key={o} active={office === o} onClick={() => setOffice(o)}>
                  {o}
                </Chip>
              ))}
            </div>
          </Field>

          <button
            type="button"
            onClick={goToAccount}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-portal-invert py-2.5 text-sm text-portal-invert-text"
          >
            Continue <ArrowRight size={16} />
          </button>
        </div>
      ) : (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setStep("details")}
            className="mb-4 text-xs text-portal-muted underline"
          >
            Edit details
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onGoogle}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-portal-border bg-portal-card py-2.5 text-sm font-medium hover:border-portal-invert disabled:opacity-50"
          >
            {busy ? <Loader2 className="animate-spin" size={16} /> : null}
            Continue with Google
          </button>
          <div className="my-5 flex items-center gap-3 text-xs text-portal-muted">
            <div className="h-px flex-1 bg-portal-border" />
            or email
            <div className="h-px flex-1 bg-portal-border" />
          </div>
          <form onSubmit={onEmail} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Work email"
              className="w-full rounded-xl border border-portal-border px-3 py-2.5 text-sm outline-none focus:border-portal-invert"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Password (min 6 characters)"
              className="w-full rounded-xl border border-portal-border px-3 py-2.5 text-sm outline-none focus:border-portal-invert"
            />
            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-portal-invert py-2.5 text-sm text-portal-invert-text disabled:opacity-50"
            >
              {busy ? <Loader2 className="animate-spin" size={16} /> : <Mail size={16} />}
              Create account
            </button>
          </form>
        </div>
      )}
    </AuthShell>
  );
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-portal-bg text-portal-text md:flex-row">
      <AmbientField />
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle compact />
      </div>
      <BrandStage />
      <div className="relative z-10 flex w-full flex-1 items-center justify-center px-4 py-10 md:w-1/2">
        <div className="glass page-enter w-full max-w-md rounded-2xl p-6">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm font-medium">{label}</div>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs transition ${
        active ? "border-portal-invert bg-portal-invert text-portal-invert-text" : "border-portal-border bg-portal-card hover:border-portal-invert pressable"
      }`}
    >
      {children}
    </button>
  );
}
