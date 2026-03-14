import { useAuth } from "@/contexts/AuthContext";
import { useStatus, type UserStatusType } from "@/contexts/StatusContext";
import { usePrivacySettings } from "@/hooks/usePrivacySettings";
import { useBlockReport } from "@/hooks/useBlockReport";
import StatusIndicator, { statusLabels } from "@/components/StatusIndicator";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";
import { Shield, Eye, MessageCircle, Gamepad2, UserPlus, Circle, ShieldBan, UserX, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

interface PrivacyDropdownProps {
  label: string;
  description: string;
  icon: React.ReactNode;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

const PrivacyDropdown = ({ label, description, icon, value, options, onChange }: PrivacyDropdownProps) => {
  const currentOption = options.find(o => o.value === value);
  
  return (
    <div className="space-y-2">
      <Label className="text-sm font-black text-foreground flex items-center gap-2">
        {icon} {label}
      </Label>
      <p className="text-xs text-muted-foreground">{description}</p>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between bg-secondary border-border text-foreground min-h-[44px] active:scale-[0.98] transition-transform"
          >
            <span className="font-medium">{currentOption?.label || value}</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]" align="start">
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
            {options.map(opt => (
              <DropdownMenuRadioItem key={opt.value} value={opt.value} className="cursor-pointer">
                {opt.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

const PrivacySettingsView = () => {
  const { user } = useAuth();
  const { settings, updateSettings } = usePrivacySettings();
  const { myStatus, setStatus } = useStatus();
  const { blockedUsers, unblockUser, refresh } = useBlockReport();
  const [blockedProfiles, setBlockedProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (blockedUsers.length === 0) return;
    const fetchNames = async () => {
      const ids = blockedUsers.map(b => b.blocked_id);
      const { data } = await (supabase as any)
        .from("mp_profiles")
        .select("user_id, username, display_name")
        .in("user_id", ids);
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((p: any) => { map[p.user_id] = p.username || p.display_name || "Unknown"; });
        setBlockedProfiles(map);
      }
    };
    fetchNames();
  }, [blockedUsers]);

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
      <PrivacyDropdown
        label="Profile Visibility"
        description="Controls who can see your stats, leaderboard rank, and achievements."
        icon={<Eye className="w-4 h-4 text-accent" />}
        value={settings.profile_visibility}
        options={[
          { value: "public", label: "Public - Everyone" },
          { value: "friends", label: "Friends Only" },
          { value: "private", label: "Private - Hidden" },
        ]}
        onChange={(v) => updateSettings({ profile_visibility: v as any })}
      />

      {/* Status Visibility */}
      <PrivacyDropdown
        label="Status Indicator Visibility"
        description="Who can see your online status. Hidden from everyone if set to 'Friends Only'."
        icon={<Shield className="w-4 h-4 text-accent" />}
        value={settings.status_visibility}
        options={[
          { value: "everyone", label: "Everyone" },
          { value: "friends", label: "Friends Only" },
        ]}
        onChange={(v) => updateSettings({ status_visibility: v as any })}
      />

      {/* Friend Requests */}
      <PrivacyDropdown
        label="Friend Requests"
        description="Who can send you friend requests."
        icon={<UserPlus className="w-4 h-4 text-accent" />}
        value={settings.receive_friend_requests}
        options={[
          { value: "everyone", label: "Everyone" },
          { value: "nobody", label: "Nobody" },
        ]}
        onChange={(v) => updateSettings({ receive_friend_requests: v as any })}
      />

      {/* Game Invites */}
      <PrivacyDropdown
        label="Game Invites"
        description="Who can invite you to games."
        icon={<Gamepad2 className="w-4 h-4 text-accent" />}
        value={settings.receive_game_invites}
        options={[
          { value: "everyone", label: "Everyone" },
          { value: "friends", label: "Friends Only" },
        ]}
        onChange={(v) => updateSettings({ receive_game_invites: v as any })}
      />

      {/* DMs */}
      <PrivacyDropdown
        label="Direct Messages"
        description="Who can send you direct messages."
        icon={<MessageCircle className="w-4 h-4 text-accent" />}
        value={settings.receive_dms}
        options={[
          { value: "everyone", label: "Everyone" },
          { value: "friends", label: "Friends Only" },
        ]}
        onChange={(v) => updateSettings({ receive_dms: v as any })}
      />

      {/* Blocked Users */}
      <div className="space-y-3">
        <h3 className="text-sm font-black text-foreground flex items-center gap-2">
          <ShieldBan className="w-4 h-4 text-destructive" /> Blocked Users
        </h3>
        {blockedUsers.length === 0 ? (
          <p className="text-xs text-muted-foreground">You haven't blocked anyone.</p>
        ) : (
          <div className="space-y-2">
            {blockedUsers.map((b) => (
              <div key={b.id} className="flex items-center justify-between bg-secondary rounded-lg px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <UserX className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-bold text-foreground">
                    {blockedProfiles[b.blocked_id] || "Loading..."}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => { await unblockUser(b.blocked_id); refresh(); }}
                  className="text-accent hover:text-accent-foreground hover:bg-accent text-xs font-bold min-h-[36px]"
                >
                  Unblock
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default PrivacySettingsView;
