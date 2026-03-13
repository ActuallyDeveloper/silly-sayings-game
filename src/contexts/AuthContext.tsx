import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type GameMode = "singleplayer" | "multiplayer" | null;

interface Profile {
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  spProfile: Profile | null;
  mpProfile: Profile | null;
  loading: boolean;
  activeMode: GameMode;
  signUp: (email: string, password: string, displayName: string, username: string) => Promise<{ error: Error | null }>;
  signIn: (username: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  setActiveMode: (mode: GameMode) => void;
  ensureMode: (mode: GameMode) => Promise<boolean>;
  fetchModeProfile: (userId: string, mode: "singleplayer" | "multiplayer") => Promise<void>;
  getModeProfile: (mode: "singleplayer" | "multiplayer") => Profile | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [spProfile, setSpProfile] = useState<Profile | null>(null);
  const [mpProfile, setMpProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMode, setActiveMode] = useState<GameMode>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id);
          fetchModeProfile(session.user.id, "singleplayer");
          fetchModeProfile(session.user.id, "multiplayer");
        }, 0);
      } else {
        setProfile(null);
        setSpProfile(null);
        setMpProfile(null);
        setActiveMode(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchModeProfile(session.user.id, "singleplayer");
        fetchModeProfile(session.user.id, "multiplayer");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    const { data } = await (supabase as any)
      .from("profiles")
      .select("display_name, avatar_url, username")
      .eq("user_id", userId)
      .single();
    setProfile(data);
  }

  const fetchModeProfile = useCallback(async (userId: string, mode: "singleplayer" | "multiplayer") => {
    const table = mode === "singleplayer" ? "sp_profiles" : "mp_profiles";
    const { data } = await (supabase as any)
      .from(table)
      .select("display_name, avatar_url, username")
      .eq("user_id", userId)
      .single();
    if (mode === "singleplayer") setSpProfile(data);
    else setMpProfile(data);
  }, []);

  const getModeProfile = useCallback((mode: "singleplayer" | "multiplayer"): Profile | null => {
    return mode === "singleplayer" ? spProfile : mpProfile;
  }, [spProfile, mpProfile]);

  const signUp = async (email: string, password: string, displayName: string, username: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName, username },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error: error as Error | null };
  };

  const signIn = async (username: string, password: string) => {
    try {
      const { data: email, error: rpcError } = await (supabase.rpc as any)("get_email_by_username", { _username: username });
      if (rpcError || !email) {
        return { error: new Error("Username not found") };
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error as Error | null };
    } catch (e: any) {
      return { error: new Error(e.message || "Sign in failed") };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setActiveMode(null);
  };

  const ensureMode = useCallback(async (mode: GameMode): Promise<boolean> => {
    if (!user) {
      setActiveMode(mode);
      return true;
    }
    if (activeMode && activeMode !== mode) {
      await supabase.auth.signOut();
      setActiveMode(mode);
      return false;
    }
    setActiveMode(mode);
    return true;
  }, [user, activeMode]);

  return (
    <AuthContext.Provider value={{
      session, user, profile, spProfile, mpProfile, loading, activeMode,
      signUp, signIn, signOut, setActiveMode, ensureMode, fetchModeProfile, getModeProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
