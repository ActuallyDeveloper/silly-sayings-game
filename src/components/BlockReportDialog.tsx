import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ShieldBan, Flag, X } from "lucide-react";

interface BlockReportDialogProps {
  username: string;
  userId: string;
  isBlocked: boolean;
  onBlock: () => void;
  onUnblock: () => void;
  onReport: (reason: string, details?: string) => void;
  onClose: () => void;
}

const REPORT_REASONS = [
  { value: "harassment", label: "Harassment" },
  { value: "inappropriate", label: "Inappropriate Content" },
  { value: "cheating", label: "Cheating" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Other" },
];

const BlockReportDialog = ({ username, userId, isBlocked, onBlock, onUnblock, onReport, onClose }: BlockReportDialogProps) => {
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-card border border-border rounded-xl w-full max-w-sm p-5 space-y-4"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-black text-foreground text-lg">@{username}</h3>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <AnimatePresence mode="wait">
          {view === "menu" && !reported && (
            <motion.div key="menu" className="space-y-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Button
                variant="outline"
                className="w-full justify-start gap-2 border-border text-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
                onClick={() => {
                  if (isBlocked) onUnblock();
                  else onBlock();
                  onClose();
                }}
              >
                <ShieldBan className="w-4 h-4" />
                {isBlocked ? "Unblock User" : "Block User"}
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2 border-border text-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
                onClick={() => setView("report")}
              >
                <Flag className="w-4 h-4" />
                Report User
              </Button>
              {isBlocked && (
                <p className="text-xs text-muted-foreground">This user is currently blocked. They cannot message you or see your status.</p>
              )}
            </motion.div>
          )}

          {view === "report" && !reported && (
            <motion.div key="report" className="space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-sm text-muted-foreground">Why are you reporting this user?</p>
              <div className="space-y-1">
                {REPORT_REASONS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setSelectedReason(r.value)}
                    className={`w-full text-left text-sm px-3 py-2 rounded-md transition-colors ${
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
            <motion.div key="done" className="text-center py-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className="text-accent font-bold">Report submitted. Thank you.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default BlockReportDialog;
