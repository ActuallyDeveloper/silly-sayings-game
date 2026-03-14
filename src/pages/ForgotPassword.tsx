import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import ExoticLogo from "@/components/ExoticLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, CheckCircle2, Gamepad2, Users } from "lucide-react";

const ForgotPassword = () => {
  const { mode } = useParams<{ mode: string }>();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const isSP = mode === "sp";
  const modeLabel = isSP ? "Single Player" : "Multiplayer";
  const authRoute = isSP ? "/sp/auth" : "/mp/auth";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email.trim()) {
      setError("Please enter your email address");
      setLoading(false);
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/${mode}/reset-password`,
    });

    if (resetError) {
      setError(resetError.message);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

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
          <h2 className="text-2xl font-black text-foreground">Check Your Email</h2>
          <p className="text-muted-foreground text-sm">
            We've sent a password reset link to <span className="font-bold text-foreground">{email}</span>.
            Please check your inbox and follow the instructions.
          </p>
          <p className="text-xs text-muted-foreground">
            Didn't receive the email? Check your spam folder or try again.
          </p>
          <div className="flex flex-col gap-2 pt-4">
            <Button
              onClick={() => setSuccess(false)}
              variant="outline"
              className="w-full border-border"
            >
              Try Another Email
            </Button>
            <Button
              onClick={() => navigate(authRoute)}
              className="w-full bg-accent text-accent-foreground hover:bg-exotic-gold-dim font-bold"
            >
              Back to Sign In
            </Button>
          </div>
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
          Forgot Password?
        </h2>
        <p className="text-sm text-center text-muted-foreground">
          Enter your email address and we'll send you a link to reset your password.
        </p>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-muted-foreground">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
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
            <Mail className="w-4 h-4 mr-2" />
          )}
          Send Reset Link
        </Button>

        <Link
          to={authRoute}
          className="block w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          <ArrowLeft className="w-3 h-3 inline mr-1" />
          Back to Sign In
        </Link>
      </motion.form>
    </div>
  );
};

export default ForgotPassword;
