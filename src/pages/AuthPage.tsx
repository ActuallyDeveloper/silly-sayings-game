import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import ExoticLogo from "@/components/ExoticLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) setError(error.message);
      else navigate("/");
    } else {
      const { error } = await signUp(email, password, displayName);
      if (error) setError(error.message);
      else setMessage("Check your email to confirm your account!");
    }
    setSubmitting(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <ExoticLogo />
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
            <Label htmlFor="displayName" className="text-muted-foreground">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Player One"
              required={!isLogin}
              className="bg-secondary border-border text-foreground"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email" className="text-muted-foreground">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="bg-secondary border-border text-foreground"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-muted-foreground">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            className="bg-secondary border-border text-foreground"
          />
        </div>

        {error && <p className="text-destructive text-sm text-center">{error}</p>}
        {message && <p className="text-accent text-sm text-center">{message}</p>}

        <Button
          type="submit"
          disabled={submitting}
          className="w-full bg-accent text-accent-foreground hover:bg-exotic-gold-dim font-bold"
        >
          {submitting ? "..." : isLogin ? "Sign In" : "Sign Up"}
        </Button>

        <button
          type="button"
          onClick={() => { setIsLogin(!isLogin); setError(""); setMessage(""); }}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </motion.form>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/")}
        className="text-muted-foreground"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back Home
      </Button>
    </div>
  );
};

export default AuthPage;
