import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ExoticLogo from "@/components/ExoticLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Gamepad2, Users, LogIn, UserPlus, Key } from "lucide-react";

interface AuthFormProps {
  mode: "singleplayer" | "multiplayer";
}

const AuthForm = ({ mode }: AuthFormProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { user, signIn, signUp, setActiveMode, fetchModeProfile, getModeProfile } = useAuth();
  const navigate = useNavigate();

  const isSP = mode === "singleplayer";
  const redirectTo = isSP ? "/play" : "/multiplayer";
  const profileTable = isSP ? "sp_profiles" : "mp_profiles";
  const modeLabel = isSP ? "Single Player" : "Multiplayer";

  // Check if user already has profile for this mode
  useEffect(() => {
    const checkProfile = async () => {
      if (user) {
        const profile = getModeProfile(mode);
        if (profile && profile.username) {
          // User already has a profile for this mode, redirect to game
          setActiveMode(mode);
          navigate(redirectTo);
        }
      }
    };
    checkProfile();
  }, [user, mode, getModeProfile]);

  const createModeProfile = async (userId: string, displayName: string, uname: string) => {
    // Check if profile already exists
    const { data: existing } = await (supabase as any)
      .from(profileTable)
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!existing) {
      const { error } = await (supabase as any).from(profileTable).insert({
        user_id: userId,
        display_name: displayName,
        username: uname,
      });
      if (error) throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!username.trim()) { setError("Username is required"); return; }
    if (!isLogin && password !== confirmPassword) { setError("Passwords don't match"); return; }

    setSubmitting(true);
    
    if (isLogin) {
      // Login flow
      const { error } = await signIn(username, password);
      if (error) {
        setError(error.message);
        setSubmitting(false);
        return;
      }
      
      // After successful login, check if user has profile for this mode
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) {
        const { data: profileData } = await (supabase as any)
          .from(profileTable)
          .select("id, username")
          .eq("user_id", authData.user.id)
          .single();
        
        if (!profileData || !profileData.username) {
          // User doesn't have a profile for this mode yet
          setError(`You don't have a ${modeLabel} profile yet. Please sign up to create one.`);
          await supabase.auth.signOut();
          setSubmitting(false);
          return;
        }
        
        setActiveMode(mode);
        await fetchModeProfile(authData.user.id, mode);
        navigate(redirectTo);
      }
    } else {
      // Sign up flow
      if (!email.trim()) { setError("Email is required"); setSubmitting(false); return; }
      
      // First check if user already exists by trying to sign in
      const { data: emailData } = await (supabase.rpc as any)("get_email_by_username", { _username: username });
      
      if (emailData) {
        // Username exists - try to sign in and create profile for this mode
        const { error: signInError } = await signIn(username, password);
        if (signInError) {
          setError("Username already taken or invalid password");
          setSubmitting(false);
          return;
        }
        
        const { data: authData } = await supabase.auth.getUser();
        if (authData.user) {
          // Check if they already have a profile for this mode
          const { data: existingProfile } = await (supabase as any)
            .from(profileTable)
            .select("id")
            .eq("user_id", authData.user.id)
            .single();
          
          if (existingProfile) {
            setError(`You already have a ${modeLabel} profile. Please sign in instead.`);
            await supabase.auth.signOut();
            setSubmitting(false);
            return;
          }
          
          // Create profile for this mode
          try {
            await createModeProfile(authData.user.id, username, username);
            setActiveMode(mode);
            await fetchModeProfile(authData.user.id, mode);
            navigate(redirectTo);
          } catch (profileError: any) {
            setError(profileError.message);
          }
        }
      } else {
        // New user - sign up
        const { error: signUpError, data: signUpData } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: username, username },
            emailRedirectTo: window.location.origin,
          },
        });
        
        if (signUpError) {
          setError(signUpError.message);
          setSubmitting(false);
          return;
        }
        
        // Auto-confirm enabled, sign in immediately
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setError(signInError.message);
          setSubmitting(false);
          return;
        }
        
        const { data: authData } = await supabase.auth.getUser();
        if (authData.user) {
          try {
            await createModeProfile(authData.user.id, username, username);
            setActiveMode(mode);
            await fetchModeProfile(authData.user.id, mode);
            navigate(redirectTo);
          } catch (profileError: any) {
            setError(profileError.message);
          }
        }
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <ExoticLogo />
      <div className="flex items-center gap-2 text-muted-foreground">
        {isSP ? <Gamepad2 className="w-5 h-5" /> : <Users className="w-5 h-5" />}
        <span className="text-xs font-bold uppercase tracking-widest">
          {modeLabel}
        </span>
      </div>

      <motion.form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-2xl font-black text-center text-foreground">
          {isLogin ? "Sign In" : `Create ${modeLabel} Profile`}
        </h2>
        
        {!isLogin && (
          <p className="text-xs text-center text-muted-foreground">
            {isSP ? "Create a separate Single Player profile to track your solo games." : "Create a separate Multiplayer profile to play with others."}
          </p>
        )}

        {!isLogin && (
          <div className="space-y-2">
            <Label htmlFor="email" className="text-muted-foreground">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" required={!isLogin} className="bg-secondary border-border text-foreground h-12" />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="username" className="text-muted-foreground">Username</Label>
          <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)}
            placeholder="coolplayer42" required className="bg-secondary border-border text-foreground h-12" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-muted-foreground">Password</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••" required minLength={6} className="bg-secondary border-border text-foreground h-12" />
        </div>

        {!isLogin && (
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-muted-foreground">Confirm Password</Label>
            <Input id="confirmPassword" type="password" value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" required minLength={6}
              className="bg-secondary border-border text-foreground h-12" />
          </div>
        )}

        {error && <p className="text-destructive text-sm text-center">{error}</p>}
        {message && <p className="text-accent text-sm text-center">{message}</p>}

        <Button type="submit" disabled={submitting}
          className="w-full bg-accent text-accent-foreground hover:bg-exotic-gold-dim font-bold h-12 text-base active:scale-95 transition-transform">
          {submitting ? (
            <><div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" /></>
          ) : isLogin ? (
            <><LogIn className="w-4 h-4 mr-2" /> Sign In</>
          ) : (
            <><UserPlus className="w-4 h-4 mr-2" /> Create Profile</>
          )}
        </Button>

        <button type="button"
          onClick={() => { setIsLogin(!isLogin); setError(""); setMessage(""); }}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2 active:opacity-70">
          {isLogin ? `Don't have a ${modeLabel} profile? Create one` : "Already have a profile? Sign in"}
        </button>
        
        {isLogin && (
          <Link to={`/${isSP ? 'sp' : 'mp'}/forgot-password`}
            className="block w-full text-center text-xs text-accent hover:underline">
            <Key className="w-3 h-3 inline mr-1" />
            Forgot password?
          </Link>
        )}
      </motion.form>

      <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-muted-foreground min-h-[44px]">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back Home
      </Button>
    </div>
  );
};

export default AuthForm;
