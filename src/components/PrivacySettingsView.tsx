import { useAuth } from "@/contexts/AuthContext";
import { usePrivacySettings } from "@/hooks/usePrivacySettings";
import { useUserStatus, UserStatusType } from "@/hooks/useUserStatus";
import { useBlockReport } from "@/hooks/useBlockReport";
import StatusIndicator, { statusLabels } from "@/components/StatusIndicator";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";
import { Shield, Eye, MessageCircle, Gamepad2, UserPlus, Circle, ShieldBan, UserX, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

interface DropdownOption {
  value: string;
  label: string;
}

const PrivacyDropdown = ({
  value,
  options,
  onChange,
}: {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
}) => {
  const currentLabel = options.find((o) => o.value === value)?.label || value;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-full flex items-center justify-between bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground min-h-[44px] hover:bg-secondary/80 transition-colors active:scale-[0.98]">
          <span>{currentLabel}</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
        {options.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={value === opt.value ? "bg-accent/10 text-accent" : ""}
          >
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const PrivacySettingsView = () => {
  const { user } = useAuth();
  const { settings, updateSettings } = usePrivacySettings();
  const { myStatus, setStatus } = useUserStatus();
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

  const profileOptions: DropdownOption[] = [
    { value: "public", label: "Public — Everyone" },
    { value: "friends", label: "Friends Only" },
    { value: "private", label: "Private — Hidden" },
  ];
  const visibilityOptions: DropdownOption[] = [
    { value: "everyone", label: "Everyone" },
    { value: "friends", label: "Friends Only" },
  ];
  const requestOptions: DropdownOption[] = [
    { value: "everyone", label: "Everyone" },
    { value: "nobody", label: "Nobody" },
  ];

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
        <PrivacyDropdown
          value={settings.profile_visibility}
          options={profileOptions}
          onChange={(v) => updateSettings({ profile_visibility: v as any })}
        />
      </div>

      {/* Status Visibility */}
      <div className="space-y-2">
        <Label className="text-sm font-black text-foreground flex items-center gap-2">
          <Shield className="w-4 h-4 text-accent" /> Status Indicator Visibility
        </Label>
        <p className="text-xs text-muted-foreground">Who can see your online status.</p>
        <PrivacyDropdown
          value={settings.status_visibility}
          options={visibilityOptions}
          onChange={(v) => updateSettings({ status_visibility: v as any })}
        />
      </div>

      {/* Friend Requests */}
      <div className="space-y-2">
        <Label className="text-sm font-black text-foreground flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-accent" /> Friend Requests
        </Label>
        <PrivacyDropdown
          value={settings.receive_friend_requests}
          options={requestOptions}
          onChange={(v) => updateSettings({ receive_friend_requests: v as any })}
        />
      </div>

      {/* Game Invites */}
      <div className="space-y-2">
        <Label className="text-sm font-black text-foreground flex items-center gap-2">
          <Gamepad2 className="w-4 h-4 text-accent" /> Game Invites
        </Label>
        <PrivacyDropdown
          value={settings.receive_game_invites}
          options={visibilityOptions}
          onChange={(v) => updateSettings({ receive_game_invites: v as any })}
        />
      </div>

      {/* DMs */}
      <div className="space-y-2">
        <Label className="text-sm font-black text-foreground flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-accent" /> Direct Messages
        </Label>
        <PrivacyDropdown
          value={settings.receive_dms}
          options={visibilityOptions}
          onChange={(v) => updateSettings({ receive_dms: v as any })}
        />
      </div>

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
