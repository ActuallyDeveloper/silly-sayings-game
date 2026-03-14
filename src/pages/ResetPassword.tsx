import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import ExoticLogo from "@/components/ExoticLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Key, Gamepad2, Users, AlertCircle } from "lucide-react";

const ResetPassword = () => {
  const { mode } = useParams<{ mode: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validSession, setValidSession] = useState<boolean | null>(null);

  const isSP = mode === "sp";
  const modeLabel = isSP ? "Single Player" : "Multiplayer";
  const authRoute = isSP ? "/sp/auth" : "/mp/auth";

  // Check if the user has a valid session from the reset link
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setValidSession(!!session);
    };
    checkSession();

    // Listen for auth state changes (from the magic link)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setValidSession(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    });

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      // Sign out after password reset
      await supabase.auth.signOut();
    }
    setLoading(false);
  };

  // Loading state while checking session
  if (validSession === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
        <ExoticLogo />
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm">Verifying your reset link...</p>
      </div>
    );
  }

  // Invalid or expired session
  if (!validSession) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
        <ExoticLogo />
        <motion.div
          className="w-full max-w-sm text-center space-y-4"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="w-16 h-16 mx-auto bg-destructive/20 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-2xl font-black text-foreground">Invalid or Expired Link</h2>
          <p className="text-muted-foreground text-sm">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <div className="flex flex-col gap-2 pt-4">
            <Button
              onClick={() => navigate(`/${mode}/forgot-password`)}
              className="w-full bg-accent text-accent-foreground hover:bg-exotic-gold-dim font-bold"
            >
              Request New Link
            </Button>
            <Button
              onClick={() => navigate(authRoute)}
              variant="outline"
              className="w-full border-border"
            >
              Back to Sign In
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
        <ExoticLogo />
        <motion.div
          className="w-full max-w-sm text-center space-y-4"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="w-16 h-16 mx-auto bg-accent/20 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-accent" />
          </div>
          <h2 className="text-2xl font-black text-foreground">Password Updated!</h2>
          <p className="text-muted-foreground text-sm">
            Your password has been successfully reset. You can now sign in with your new password.
          </p>
          <Button
            onClick={() => navigate(authRoute)}
            className="w-full bg-accent text-accent-foreground hover:bg-exotic-gold-dim font-bold mt-4"
          >
            Go to Sign In
          </Button>
        </motion.div>
      </div>
    );
  }

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
          Reset Password
        </h2>
        <p className="text-sm text-center text-muted-foreground">
          Enter your new password below.
        </p>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-muted-foreground">New Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            className="bg-secondary border-border text-foreground h-12"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-muted-foreground">Confirm New Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            className="bg-secondary border-border text-foreground h-12"
          />
        </div>

        {error && <p className="text-destructive text-sm text-center">{error}</p>}

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-accent text-accent-foreground hover:bg-exotic-gold-dim font-bold h-12 text-base active:scale-95 transition-transform"
        >
          {loading ? (
            <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Key className="w-4 h-4 mr-2" />
          )}
          Reset Password
        </Button>
      </motion.form>
    </div>
  );
};

export default ResetPassword;
