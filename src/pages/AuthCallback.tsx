import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authErrorMessage, finishAuthAndEnter } from "../lib/onboarding";
import { requireSupabase } from "../lib/supabase";
import { consumePendingLoginAfterSignup, loadSignupDraft } from "../lib/signupDraft";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { selectTeam, signOut } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    async function run() {
      const sb = requireSupabase();
      let session = (await sb.auth.getSession()).data.session;
      if (!session) {
        await new Promise((r) => setTimeout(r, 600));
        session = (await sb.auth.getSession()).data.session;
      }
      if (!session?.user) {
        navigate("/login", { replace: true });
        return;
      }

      const pendingLogin = consumePendingLoginAfterSignup();
      if (pendingLogin) {
        const draft = loadSignupDraft();
        if (draft) {
          await sb.auth.updateUser({
            data: {
              full_name: draft.fullName,
              job_title: draft.jobTitle,
              office: draft.office,
              clearance_level: String(draft.clearanceLevel),
              team_slug: draft.teamSlug,
            },
          });
        }
        await signOut();
        navigate("/login?registered=1", { replace: true });
        return;
      }

      const result = await finishAuthAndEnter({
        userId: session.user.id,
        selectTeam,
      });
      if ("needTeam" in result) {
        navigate("/choose-team", { replace: true });
        return;
      }
      navigate(result.user.is_admin ? "/admin" : "/", { replace: true });
    }

    run().catch((e: any) => setError(authErrorMessage(e)));
  }, [navigate, selectTeam, signOut]);

  return (
    <div className="grid h-screen place-items-center bg-portal-bg text-portal-text">
      <div className="text-center text-sm text-portal-muted">
        {error || "Completing sign in…"}
        {error && (
          <button type="button" className="mt-3 block underline" onClick={() => navigate("/login")}>
            Back to login
          </button>
        )}
      </div>
    </div>
  );
}
