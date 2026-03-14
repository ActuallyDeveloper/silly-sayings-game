import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useFriends } from "@/hooks/useFriends";
import { useGameInvites } from "@/hooks/useGameInvites";
import { useStatus } from "@/contexts/StatusContext";
import { useBlockReport } from "@/hooks/useBlockReport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StatusIndicator from "@/components/StatusIndicator";
import BlockReportDialog from "@/components/BlockReportDialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus, UserCheck, UserX, Search, Users, MessageCircle,
  Gamepad2, Check, X, Clock, Send, ShieldBan, MoreVertical,
} from "lucide-react";

interface FriendsListProps {
  onOpenDM: (userId: string, username: string) => void;
  onInviteToGame?: (userId: string) => void;
}

const FriendsList = ({ onOpenDM, onInviteToGame }: FriendsListProps) => {
  const { user } = useAuth();
  const { friends, pendingReceived, pendingSent, sendRequest, acceptRequest, declineRequest, removeFriend, searchUsers } = useFriends();
  const { received: invitesReceived, acceptInvite, declineInvite } = useGameInvites();
  const { getStatusWithPrivacy } = useStatus();
  const { blockUser, unblockUser, reportUser, isBlocked } = useBlockReport();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [tab, setTab] = useState<"friends" | "requests" | "invites">("friends");
  const [blockReportTarget, setBlockReportTarget] = useState<{ userId: string; username: string } | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const results = await searchUsers(searchQuery);
    setSearchResults(results);
    setSearching(false);
  };

  const isFriendOrPending = (userId: string) => {
    return friends.some(f => f.friend_profile?.user_id === userId) ||
      pendingSent.some(f => f.friend_profile?.user_id === userId) ||
      pendingReceived.some(f => f.friend_profile?.user_id === userId);
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex gap-2">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search users by username..."
          className="bg-secondary border-border text-foreground h-11"
        />
        <Button size="sm" onClick={handleSearch} disabled={searching}
          className="bg-accent text-accent-foreground hover:bg-exotic-gold-dim h-11 active:scale-95 transition-transform">
          <Search className="w-4 h-4" />
        </Button>
      </div>

      {/* Search results */}
      {searchResults.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Search Results</p>
          {searchResults.map((u) => (
            <div key={u.user_id} className="flex items-center justify-between bg-secondary rounded-lg px-4 py-3 min-h-[52px]">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="font-bold text-foreground text-sm">@{u.username || u.display_name}</span>
                {isBlocked(u.user_id) && <ShieldBan className="w-3 h-3 text-destructive" />}
              </div>
              {u.user_id === user?.id ? (
                <span className="text-xs text-muted-foreground">You</span>
              ) : (
                <div className="flex items-center gap-1">
                  {isFriendOrPending(u.user_id) ? (
                    <span className="text-xs text-accent flex items-center gap-1"><Check className="w-3 h-3" /> Added</span>
                  ) : !isBlocked(u.user_id) && (
                    <Button size="sm" variant="ghost" onClick={() => sendRequest(u.user_id)}
                      className="text-accent active:scale-95 transition-transform">
                      <UserPlus className="w-4 h-4" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost"
                    onClick={() => setBlockReportTarget({ userId: u.user_id, username: u.username || u.display_name || "" })}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                    <MoreVertical className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary rounded-lg p-1">
        {([
          { key: "friends", label: "Friends", count: friends.length },
          { key: "requests", label: "Requests", count: pendingReceived.length },
          { key: "invites", label: "Invites", count: invitesReceived.length },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 text-xs font-bold py-2 rounded-md transition-colors min-h-[40px] active:scale-95 ${
              tab === t.key ? "bg-accent text-accent-foreground" : "text-muted-foreground"
            }`}>
            {t.label} {t.count > 0 && <span className="ml-1 bg-destructive text-destructive-foreground rounded-full px-1.5 text-[10px]">{t.count}</span>}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "friends" && (
          <motion.div key="friends" className="space-y-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {friends.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No friends yet. Search and add some!</p>
            ) : friends.map(f => {
              const { status, canView } = getStatusWithPrivacy(f.friend_profile?.user_id || "");
              return (
                <div key={f.id} className="flex items-center justify-between bg-secondary rounded-lg px-4 py-3 min-h-[52px]">
                  <div className="flex items-center gap-2">
                    {canView && <StatusIndicator status={status as any} showLabel={false} />}
                    <span className="font-bold text-foreground text-sm">@{f.friend_profile?.username || f.friend_profile?.display_name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => onOpenDM(f.friend_profile!.user_id, f.friend_profile!.username || "")}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-accent">
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                    {onInviteToGame && (
                      <Button size="sm" variant="ghost" onClick={() => onInviteToGame(f.friend_profile!.user_id)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-accent">
                        <Gamepad2 className="w-4 h-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost"
                      onClick={() => setBlockReportTarget({ userId: f.friend_profile!.user_id, username: f.friend_profile!.username || f.friend_profile!.display_name || "" })}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                      <MoreVertical className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => removeFriend(f.id)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                      <UserX className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {tab === "requests" && (
          <motion.div key="requests" className="space-y-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {pendingReceived.length === 0 && pendingSent.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No pending requests.</p>
            ) : (
              <>
                {pendingReceived.map(f => (
                  <div key={f.id} className="flex items-center justify-between bg-secondary rounded-lg px-4 py-3 min-h-[52px]">
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-accent" />
                      <span className="font-bold text-foreground text-sm">@{f.friend_profile?.username || f.friend_profile?.display_name}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => acceptRequest(f.id)}
                        className="bg-accent text-accent-foreground h-8 active:scale-95 transition-transform">
                        <Check className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => declineRequest(f.id)}
                        className="text-destructive h-8 active:scale-95 transition-transform">
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {pendingSent.map(f => (
                  <div key={f.id} className="flex items-center justify-between bg-secondary rounded-lg px-4 py-3 min-h-[52px]">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground text-sm">@{f.friend_profile?.username || f.friend_profile?.display_name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Sent</span>
                  </div>
                ))}
              </>
            )}
          </motion.div>
        )}

        {tab === "invites" && (
          <motion.div key="invites" className="space-y-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {invitesReceived.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No game invites.</p>
            ) : invitesReceived.map(inv => (
              <div key={inv.id} className="flex items-center justify-between bg-secondary rounded-lg px-4 py-3 min-h-[52px]">
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-accent" />
                  <div>
                    <span className="font-bold text-foreground text-sm">@{inv.sender_profile?.username}</span>
                    {inv.room && <span className="text-xs text-muted-foreground ml-2">Room: {inv.room.room_code}</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" onClick={() => acceptInvite(inv.id)}
                    className="bg-accent text-accent-foreground h-8 active:scale-95 transition-transform">
                    <Check className="w-3 h-3 mr-1" /> Join
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => declineInvite(inv.id)}
                    className="text-destructive h-8 active:scale-95 transition-transform">
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {blockReportTarget && (
          <BlockReportDialog
            username={blockReportTarget.username}
            userId={blockReportTarget.userId}
            isBlocked={isBlocked(blockReportTarget.userId)}
            onBlock={() => blockUser(blockReportTarget.userId)}
            onUnblock={() => unblockUser(blockReportTarget.userId)}
            onReport={(reason, details) => reportUser(blockReportTarget.userId, reason, details)}
            onClose={() => setBlockReportTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default FriendsList;
