import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import ExoticLogo from "@/components/ExoticLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, Check } from "lucide-react";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError("Email is required"); return; }

    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setSubmitting(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <ExoticLogo />

      {sent ? (
        <motion.div className="text-center space-y-3" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <Check className="w-12 h-12 text-accent mx-auto" />
          <h2 className="text-2xl font-black text-foreground">Check Your Email</h2>
          <p className="text-muted-foreground text-sm max-w-sm">
            We've sent a password reset link to <span className="text-foreground font-bold">{email}</span>.
          </p>
          <Button variant="ghost" onClick={() => navigate("/")} className="text-muted-foreground mt-4">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back Home
          </Button>
        </motion.div>
      ) : (
        <motion.form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Mail className="w-12 h-12 text-accent mx-auto" />
          <h2 className="text-2xl font-black text-center text-foreground">Forgot Password</h2>
          <p className="text-muted-foreground text-sm text-center">Enter your email to receive a reset link.</p>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" required
              className="bg-secondary border-border text-foreground h-12" />
          </div>

          {error && <p className="text-destructive text-sm text-center">{error}</p>}

          <Button type="submit" disabled={submitting}
            className="w-full bg-accent text-accent-foreground hover:bg-exotic-gold-dim font-bold h-12 text-base">
            {submitting ? "..." : "Send Reset Link"}
          </Button>

          <Button variant="ghost" type="button" onClick={() => navigate(-1)}
            className="w-full text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        </motion.form>
      )}
    </div>
  );
};

export default ForgotPassword;
