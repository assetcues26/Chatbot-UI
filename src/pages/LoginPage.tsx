import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "../components/ThemeToggle";
import BrandStage from "../components/BrandStage";
import AmbientField from "../components/AmbientField";
import { api } from "../lib/api";
import { authErrorMessage, finishAuthAndEnter } from "../lib/onboarding";
import { requireSupabase, supabaseConfigured } from "../lib/supabase";
import { saveMemberSession, setActiveTeam } from "../lib/storage";
import { DEMO_USERS } from "../lib/types";

export default function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { supabaseConfigured: sbOk, selectTeam } = useAuth();
  const justRegistered = params.get("registered") === "1";
  const [email, setEmail] = useState(params.get("email") || "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const successNote = useMemo(() => {
    if (!justRegistered) return null;
    return "Account created. Log in with the same email and password.";
  }, [justRegistered]);

  async function onGoogle() {
    if (!supabaseConfigured) return;
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
      setError(authErrorMessage(e));
      setBusy(false);
    }
  }

  async function onEmail(e: FormEvent) {
    e.preventDefault();
    if (!supabaseConfigured) return;
    setBusy(true);
    setError(null);
    try {
      const sb = requireSupabase();
      const { data, error: err } = await sb.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err) throw err;
      if (!data.user) throw new Error("Sign in failed");
      const result = await finishAuthAndEnter({ userId: data.user.id, selectTeam });
      if ("needTeam" in result) {
        navigate("/choose-team", { replace: true });
        return;
      }
      navigate(result.user.is_admin ? "/admin" : "/", { replace: true });
    } catch (err: any) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onLegacyLogin(demoEmail?: string) {
    const loginEmail = demoEmail || email;
    const loginPassword = demoEmail ? "password123" : password;
    setBusy(true);
    setError(null);
    try {
      const { user } = await api.login(loginEmail.trim(), loginPassword);
      saveMemberSession(user);
      setActiveTeam("legacy-demo", "Demo");
      navigate(user.is_admin ? "/admin" : "/", { replace: true });
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-portal-bg text-portal-text md:flex-row">
      <AmbientField />
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle compact />
      </div>
      <BrandStage />

      <div className="relative z-10 flex w-full flex-1 items-center justify-center px-4 py-10 md:w-1/2">
        <div className="glass page-enter w-full max-w-md rounded-2xl p-6">
          <div className="text-2xl font-semibold tracking-tight text-portal-text">Log in</div>
          <p className="mt-1 text-sm text-portal-muted">Welcome back to AssetCues Portal</p>

          {successNote && (
            <div className="mt-4 rounded-lg border border-portal-ok-border bg-portal-ok-bg px-3 py-2 text-sm text-portal-ok">
              {successNote}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-portal-danger-border bg-portal-danger-bg px-3 py-2 text-sm text-portal-danger">
              {error}
            </div>
          )}

          {sbOk ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={onGoogle}
                className="glass mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-portal-text hover:bg-white/20 disabled:opacity-50"
              >
                {busy ? <Loader2 className="animate-spin" size={16} /> : null}
                Continue with Google
              </button>

              <div className="my-6 flex items-center gap-3 text-xs text-portal-muted">
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
                  placeholder="Email"
                  className="w-full rounded-xl border border-portal-border px-3 py-2.5 text-sm outline-none focus:border-portal-invert"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Password"
                  className="w-full rounded-xl border border-portal-border px-3 py-2.5 text-sm outline-none focus:border-portal-invert"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-portal-invert py-2.5 text-sm font-medium text-portal-invert-text disabled:opacity-50"
                >
                  {busy ? <Loader2 className="animate-spin" size={16} /> : <ArrowRight size={16} />}
                  Log in
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-portal-muted">
                Don&apos;t have an account?{" "}
                <Link to="/signup" className="font-medium text-portal-text underline underline-offset-2">
                  Sign up
                </Link>
              </p>
            </>
          ) : (
            <div className="mt-6 space-y-3">
              <p className="rounded-lg border border-portal-warn-border bg-portal-warn-bg px-3 py-2 text-xs text-portal-warn">
                Supabase is not configured. Using demo FastAPI login. Set <code>VITE_SUPABASE_URL</code> and{" "}
                <code>VITE_SUPABASE_ANON_KEY</code> in <code>frontend/.env</code>.
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full rounded-xl border border-portal-border px-3 py-2.5 text-sm outline-none focus:border-portal-invert"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password123"
                className="w-full rounded-xl border border-portal-border px-3 py-2.5 text-sm outline-none focus:border-portal-invert"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => onLegacyLogin()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-portal-invert py-2.5 text-sm text-portal-invert-text disabled:opacity-50"
              >
                {busy ? <Loader2 className="animate-spin" size={16} /> : <ArrowRight size={16} />}
                Log in
              </button>
              <div className="flex flex-wrap gap-2 pt-2">
                {DEMO_USERS.slice(0, 4).map((d) => (
                  <button
                    key={d.email}
                    type="button"
                    disabled={busy}
                    onClick={() => onLegacyLogin(d.email)}
                    className="rounded-full border border-portal-border px-3 py-1 text-[11px] hover:border-portal-invert"
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
