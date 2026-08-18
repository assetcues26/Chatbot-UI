import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { api } from "../lib/api";
import { getProfile } from "../lib/portalApi";
import type { PortalProfile } from "../lib/portalTypes";
import { supabase, supabaseConfigured } from "../lib/supabase";
import {
  clearMemberSession,
  getActiveTeamId,
  getToken,
  loadMemberSession,
  saveMemberSession,
  setActiveTeam,
} from "../lib/storage";
import type { CompanyUser } from "../lib/types";
import { toCompanyUser } from "../lib/types";

interface AuthContextValue {
  ready: boolean;
  supabaseSession: Session | null;
  supabaseUser: SupabaseUser | null;
  profile: PortalProfile | null;
  fastApiUser: CompanyUser | null;
  activeTeamId: string | null;
  connected: boolean;
  supabaseConfigured: boolean;
  refreshHealth: () => Promise<void>;
  refreshFastApiUser: () => Promise<void>;
  selectTeam: (teamId: string, teamName: string, departmentKey?: string) => Promise<CompanyUser>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [supabaseSession, setSupabaseSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<PortalProfile | null>(null);
  const [fastApiUser, setFastApiUser] = useState<CompanyUser | null>(() => loadMemberSession());
  const [activeTeamId, setActiveTeamIdState] = useState<string | null>(() => getActiveTeamId());
  const [connected, setConnected] = useState(false);

  const refreshHealth = useCallback(async () => {
    try {
      const h = await api.health();
      setConnected(Boolean(h.ok));
    } catch {
      setConnected(false);
    }
  }, []);

  const refreshFastApiUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setFastApiUser(null);
      return;
    }
    try {
      const me = await api.me();
      const user = toCompanyUser(me);
      setFastApiUser(user);
      saveMemberSession(user);
      setConnected(true);
    } catch {
      clearMemberSession();
      setFastApiUser(null);
    }
  }, []);

  useEffect(() => {
    refreshHealth();
    const timer = window.setInterval(refreshHealth, 8000);
    return () => window.clearInterval(timer);
  }, [refreshHealth]);

  useEffect(() => {
    if (!supabaseConfigured) {
      setReady(true);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSupabaseSession(data.session);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseSession(session);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabaseSession?.user?.id || !supabaseConfigured) {
      setProfile(null);
      return;
    }
    getProfile(supabaseSession.user.id)
      .then(setProfile)
      .catch(() => setProfile(null));
  }, [supabaseSession?.user?.id]);

  useEffect(() => {
    if (getToken()) refreshFastApiUser();
  }, [refreshFastApiUser]);

  const selectTeam = useCallback(async (teamId: string, teamName: string, departmentKey?: string) => {
    const { data } = supabaseConfigured
      ? await supabase.auth.getSession()
      : { data: { session: supabaseSession } };
    const accessToken = data.session?.access_token || supabaseSession?.access_token;
    if (!accessToken) {
      throw new Error("Not signed in with Supabase");
    }
    const { user } = await api.exchangeSupabase(accessToken, teamId, departmentKey);
    setActiveTeam(teamId, teamName);
    setActiveTeamIdState(teamId);
    setFastApiUser(user);
    saveMemberSession(user);
    return user;
  }, [supabaseSession?.access_token]);

  const signOut = useCallback(async () => {
    if (supabaseConfigured) {
      await supabase.auth.signOut();
    }
    clearMemberSession();
    setSupabaseSession(null);
    setProfile(null);
    setFastApiUser(null);
    setActiveTeamIdState(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      supabaseSession,
      supabaseUser: supabaseSession?.user ?? null,
      profile,
      fastApiUser,
      activeTeamId,
      connected,
      supabaseConfigured,
      refreshHealth,
      refreshFastApiUser,
      selectTeam,
      signOut,
    }),
    [
      ready,
      supabaseSession,
      profile,
      fastApiUser,
      activeTeamId,
      connected,
      refreshHealth,
      refreshFastApiUser,
      selectTeam,
      signOut,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
