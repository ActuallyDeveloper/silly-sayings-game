import { useAuth } from "@/contexts/AuthContext";
import { usePrivacySettings } from "@/hooks/usePrivacySettings";
import { useUserStatus, UserStatusType } from "@/hooks/useUserStatus";
import StatusIndicator, { statusLabels } from "@/components/StatusIndicator";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Shield, Eye, MessageCircle, Gamepad2, UserPlus, Circle } from "lucide-react";

const selectClass = "w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground min-h-[44px] active:scale-[0.98] transition-transform";

const PrivacySettingsView = () => {
  const { user } = useAuth();
  const { settings, updateSettings } = usePrivacySettings();
  const { myStatus, setStatus } = useUserStatus();

  if (!user) return null;

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Status */}
      <div className="space-y-3">
        <h3 className="text-sm font-black text-foreground flex items-center gap-2">
          <Circle className="w-4 h-4 text-accent" /> Your Status
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {(["available", "away", "busy", "invisible"] as UserStatusType[]).map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold min-h-[44px] active:scale-95 transition-all ${
                myStatus === s ? "bg-accent text-accent-foreground" : "bg-secondary text-foreground"
              }`}>
              <StatusIndicator status={s} size={8} />
              {statusLabels[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Profile Visibility */}
      <div className="space-y-2">
        <Label className="text-sm font-black text-foreground flex items-center gap-2">
          <Eye className="w-4 h-4 text-accent" /> Profile Visibility
        </Label>
        <p className="text-xs text-muted-foreground">Controls who can see your stats, leaderboard rank, and achievements.</p>
        <select value={settings.profile_visibility} onChange={(e) => updateSettings({ profile_visibility: e.target.value as any })}
          className={selectClass}>
          <option value="public">Public — Everyone</option>
          <option value="friends">Friends Only</option>
          <option value="private">Private — Hidden</option>
        </select>
      </div>

      {/* Status Visibility */}
      <div className="space-y-2">
        <Label className="text-sm font-black text-foreground flex items-center gap-2">
          <Shield className="w-4 h-4 text-accent" /> Status Indicator Visibility
        </Label>
        <p className="text-xs text-muted-foreground">Who can see your online status. Hidden from everyone if set to "Friends Only".</p>
        <select value={settings.status_visibility} onChange={(e) => updateSettings({ status_visibility: e.target.value as any })}
          className={selectClass}>
          <option value="everyone">Everyone</option>
          <option value="friends">Friends Only</option>
        </select>
      </div>

      {/* Friend Requests */}
      <div className="space-y-2">
        <Label className="text-sm font-black text-foreground flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-accent" /> Friend Requests
        </Label>
        <select value={settings.receive_friend_requests} onChange={(e) => updateSettings({ receive_friend_requests: e.target.value as any })}
          className={selectClass}>
          <option value="everyone">Everyone</option>
          <option value="nobody">Nobody</option>
        </select>
      </div>

      {/* Game Invites */}
      <div className="space-y-2">
        <Label className="text-sm font-black text-foreground flex items-center gap-2">
          <Gamepad2 className="w-4 h-4 text-accent" /> Game Invites
        </Label>
        <select value={settings.receive_game_invites} onChange={(e) => updateSettings({ receive_game_invites: e.target.value as any })}
          className={selectClass}>
          <option value="everyone">Everyone</option>
          <option value="friends">Friends Only</option>
        </select>
      </div>

      {/* DMs */}
      <div className="space-y-2">
        <Label className="text-sm font-black text-foreground flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-accent" /> Direct Messages
        </Label>
        <select value={settings.receive_dms} onChange={(e) => updateSettings({ receive_dms: e.target.value as any })}
          className={selectClass}>
          <option value="everyone">Everyone</option>
          <option value="friends">Friends Only</option>
        </select>
      </div>
    </motion.div>
  );
};

export default PrivacySettingsView;
