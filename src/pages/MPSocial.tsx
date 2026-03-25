import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import ExoticLogo from "@/components/ExoticLogo";
import FriendsList from "@/components/FriendsList";
import DMView from "@/components/DMView";
import PrivacySettingsView from "@/components/PrivacySettingsView";
import { Button } from "@/components/ui/button";
import { useGameInvites } from "@/hooks/useGameInvites";
import { ArrowLeft, Users, Shield } from "lucide-react";
import { toast } from "sonner";

const MPSocial = () => {
  const navigate = useNavigate();
  const { user, ensureMode } = useAuth();
  const { sendInvite } = useGameInvites();
  const [view, setView] = useState<"friends" | "dm" | "privacy">("friends");
  const [dmUser, setDmUser] = useState<{ id: string; username: string } | null>(null);

  useEffect(() => {
    ensureMode("multiplayer").then((ok) => {
      if (!ok) navigate("/mp/auth");
    });
  }, []);

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
        <Users className="w-16 h-16 text-muted-foreground/30" />
        <h1 className="text-3xl font-black text-foreground">Social</h1>
        <p className="text-muted-foreground">Sign in to access friends and messaging.</p>
        <Button onClick={() => navigate("/mp/auth")} className="bg-accent text-accent-foreground hover:bg-exotic-gold-dim font-bold min-h-[44px]">
          Sign In
        </Button>
      </div>
    );
  }

  const handleOpenDM = (userId: string, username: string) => {
    setDmUser({ id: userId, username });
    setView("dm");
  };

  const handleInviteToGame = (userId: string) => {
    sendInvite(userId)
      .then(() => toast.success("Game invite sent!"))
      .catch((error: any) => toast.error(error.message || "Unable to send game invite."));
  };

  if (view === "dm" && dmUser) {
    return (
      <div className="min-h-screen flex flex-col">
        <DMView otherUserId={dmUser.id} otherUsername={dmUser.username} onBack={() => { setView("friends"); setDmUser(null); }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-border">
        <ExoticLogo size="sm" />
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-accent">Social</span>
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-muted-foreground min-h-[44px]">
            <ArrowLeft className="w-4 h-4 mr-1" /> Home
          </Button>
        </div>
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        {/* Tab nav */}
        <div className="flex gap-1 bg-secondary rounded-lg p-1 mb-6">
          {([
            { key: "friends" as const, icon: Users, label: "Friends" },
            { key: "privacy" as const, icon: Shield, label: "Privacy" },
          ]).map(t => (
            <button key={t.key} onClick={() => setView(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-md transition-colors min-h-[44px] active:scale-95 ${
                view === t.key ? "bg-accent text-accent-foreground" : "text-muted-foreground"
              }`}>
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {view === "friends" && (
          <FriendsList
            onOpenDM={handleOpenDM}
            onInviteToGame={handleInviteToGame}
          />
        )}
        {view === "privacy" && <PrivacySettingsView />}
      </div>
    </div>
  );
};

export default MPSocial;
