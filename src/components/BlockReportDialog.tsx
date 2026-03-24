import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ShieldBan, Flag, X, MessageCircle, Gamepad2, UserX } from "lucide-react";

interface BlockReportDialogProps {
  username: string;
  userId: string;
  isBlocked: boolean;
  onBlock: () => void;
  onUnblock: () => void;
  onReport: (reason: string, details?: string) => void;
  onClose: () => void;
  onOpenDM?: () => void;
  onInviteToGame?: () => void;
  onRemoveFriend?: () => void;
  isFriend?: boolean;
}

const REPORT_REASONS = [
  { value: "harassment", label: "Harassment" },
  { value: "inappropriate", label: "Inappropriate Content" },
  { value: "cheating", label: "Cheating" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Other" },
];

const BlockReportDialog = ({
  username, userId, isBlocked, onBlock, onUnblock, onReport, onClose,
  onOpenDM, onInviteToGame, onRemoveFriend, isFriend,
}: BlockReportDialogProps) => {
  const [view, setView] = useState<"menu" | "report">("menu");
  const [selectedReason, setSelectedReason] = useState("inappropriate");
  const [details, setDetails] = useState("");
  const [reported, setReported] = useState(false);

  const handleReport = () => {
    onReport(selectedReason, details || undefined);
    setReported(true);
    setTimeout(onClose, 1500);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-4 pb-4 sm:pb-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-background border border-border rounded-2xl w-full max-w-sm overflow-hidden"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="font-black text-foreground text-lg">@{username}</h3>
            <p className="text-xs text-muted-foreground">Player Options</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-full bg-secondary hover:bg-secondary/80 transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {view === "menu" && !reported && (
            <motion.div key="menu" className="p-3 space-y-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Social actions */}
              {onOpenDM && !isBlocked && (
                <button
                  onClick={() => { onOpenDM(); onClose(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-foreground hover:bg-accent/10 transition-colors active:scale-[0.98]"
                >
                  <MessageCircle className="w-4 h-4 text-accent" />
                  Send Message
                </button>
              )}
              {onInviteToGame && !isBlocked && (
                <button
                  onClick={() => { onInviteToGame(); onClose(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-foreground hover:bg-accent/10 transition-colors active:scale-[0.98]"
                >
                  <Gamepad2 className="w-4 h-4 text-accent" />
                  Invite to Game
                </button>
              )}
              {onRemoveFriend && isFriend && (
                <button
                  onClick={() => { onRemoveFriend(); onClose(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-foreground hover:bg-destructive/10 transition-colors active:scale-[0.98]"
                >
                  <UserX className="w-4 h-4 text-destructive" />
                  Remove Friend
                </button>
              )}

              <div className="h-px bg-border my-1" />

              {/* Block */}
              <button
                onClick={() => {
                  if (isBlocked) onUnblock();
                  else onBlock();
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-foreground hover:bg-destructive/10 hover:text-destructive transition-colors active:scale-[0.98]"
              >
                <ShieldBan className="w-4 h-4" />
                {isBlocked ? "Unblock User" : "Block User"}
              </button>

              {/* Report */}
              <button
                onClick={() => setView("report")}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-foreground hover:bg-destructive/10 hover:text-destructive transition-colors active:scale-[0.98]"
              >
                <Flag className="w-4 h-4" />
                Report User
              </button>

              {isBlocked && (
                <p className="text-xs text-muted-foreground px-4 py-2">This user is blocked. They cannot message you or see your status.</p>
              )}
            </motion.div>
          )}

          {view === "report" && !reported && (
            <motion.div key="report" className="p-4 space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-sm text-muted-foreground font-bold">Why are you reporting this user?</p>
              <div className="space-y-1">
                {REPORT_REASONS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setSelectedReason(r.value)}
                    className={`w-full text-left text-sm px-3 py-2.5 rounded-lg transition-colors ${
                      selectedReason === r.value
                        ? "bg-accent text-accent-foreground font-bold"
                        : "text-foreground hover:bg-secondary"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <Textarea
                placeholder="Additional details (optional)..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="bg-secondary border-border text-foreground text-sm"
                rows={3}
              />
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setView("menu")} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={handleReport}
                  className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
                >
                  Submit Report
                </Button>
              </div>
            </motion.div>
          )}

          {reported && (
            <motion.div key="done" className="text-center py-8 px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className="text-accent font-bold">Report submitted. Thank you.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default BlockReportDialog;
