import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import ExoticLogo from "@/components/ExoticLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Gamepad2, Users, LogIn } from "lucide-react";

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
  const { signIn, signUp, ensureMode, setActiveMode } = useAuth();
  const navigate = useNavigate();

  const isSP = mode === "singleplayer";
  const redirectTo = isSP ? "/play" : "/multiplayer";
  const otherMode = isSP ? "multiplayer" : "singleplayer";
  const otherModeLabel = isSP ? "Multiplayer" : "Single Player";

  // Set active mode on mount and handle mode switching
  useEffect(() => {
    ensureMode(mode).then((canProceed) => {
      if (!canProceed) {
        setMessage(`Signed out from ${otherModeLabel}. Please sign in for ${isSP ? "Single Player" : "Multiplayer"}.`);
      }
    });
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!username.trim()) { setError("Username is required"); return; }
    if (!isLogin && password !== confirmPassword) { setError("Passwords don't match"); return; }

    setSubmitting(true);
    if (isLogin) {
      const { error } = await signIn(username, password);
      if (error) setError(error.message);
      else {
        setActiveMode(mode);
        navigate(redirectTo);
      }
    } else {
      if (!email.trim()) { setError("Email is required"); setSubmitting(false); return; }
      const { error } = await signUp(email, password, username, username);
      if (error) {
        setError(error.message);
      } else {
        // Auto-confirm is enabled, sign in immediately
        const { error: signInError } = await signIn(username, password);
        if (signInError) {
          setError(signInError.message);
        } else {
          setActiveMode(mode);
          navigate(redirectTo);
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
          {isSP ? "Single Player" : "Multiplayer"}
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
          {isLogin ? "Welcome Back" : "Create Account"}
        </h2>

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
          <LogIn className="w-4 h-4 mr-2" />
          {submitting ? "..." : isLogin ? "Sign In" : "Sign Up"}
        </Button>

        <button type="button"
          onClick={() => { setIsLogin(!isLogin); setError(""); setMessage(""); }}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2 active:opacity-70">
          {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </motion.form>

      <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-muted-foreground min-h-[44px]">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back Home
      </Button>
    </div>
  );
};

export default AuthForm;
