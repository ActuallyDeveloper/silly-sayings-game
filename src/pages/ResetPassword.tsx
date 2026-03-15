import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import ExoticLogo from "@/components/ExoticLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Check, ArrowLeft } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (password !== confirmPassword) { setError("Passwords don't match"); return; }

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => navigate("/"), 2000);
    }
    setSubmitting(false);
  };

  if (!isRecovery) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
        <ExoticLogo />
        <p className="text-muted-foreground text-center">Invalid or expired reset link.</p>
        <Button variant="ghost" onClick={() => navigate("/")} className="text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back Home
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <ExoticLogo />
      <KeyRound className="w-12 h-12 text-accent" />

      {success ? (
        <motion.div className="text-center space-y-3" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <Check className="w-12 h-12 text-accent mx-auto" />
          <h2 className="text-2xl font-black text-foreground">Password Updated!</h2>
          <p className="text-muted-foreground">Redirecting you home...</p>
        </motion.div>
      ) : (
        <motion.form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-2xl font-black text-center text-foreground">Set New Password</h2>

          <div className="space-y-2">
            <Label className="text-muted-foreground">New Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" required minLength={6}
              className="bg-secondary border-border text-foreground h-12" />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Confirm Password</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••" required minLength={6}
              className="bg-secondary border-border text-foreground h-12" />
          </div>

          {error && <p className="text-destructive text-sm text-center">{error}</p>}

          <Button type="submit" disabled={submitting}
            className="w-full bg-accent text-accent-foreground hover:bg-exotic-gold-dim font-bold h-12 text-base">
            {submitting ? "..." : "Update Password"}
          </Button>
        </motion.form>
      )}
    </div>
  );
};

export default ResetPassword;
