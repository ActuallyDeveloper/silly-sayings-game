import { motion } from "framer-motion";
import { Circle } from "lucide-react";
import type { UserStatusType } from "@/hooks/useUserStatus";

const statusColors: Record<UserStatusType, string> = {
  available: "text-green-500",
  away: "text-yellow-500",
  busy: "text-red-500",
  invisible: "text-muted-foreground/30",
};

const statusLabels: Record<UserStatusType, string> = {
  available: "Online",
  away: "Away",
  busy: "Busy",
  invisible: "Offline",
};

const pulseColors: Record<UserStatusType, string> = {
  available: "bg-green-500/30",
  away: "bg-yellow-500/30",
  busy: "bg-red-500/30",
  invisible: "bg-muted/30",
};

interface StatusBadgeProps {
  status: UserStatusType;
  username?: string;
  showLabel?: boolean;
  size?: "sm" | "md";
}

const StatusBadge = ({ status, username, showLabel = true, size = "sm" }: StatusBadgeProps) => {
  const dotSize = size === "sm" ? 8 : 10;
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <span className="inline-flex items-center gap-1.5">
      {username && <span className={`font-bold text-foreground ${textSize}`}>@{username}</span>}
      <span className="relative inline-flex items-center">
        {status === "available" && (
          <motion.span
            className={`absolute inset-0 rounded-full ${pulseColors[status]}`}
            animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{ width: dotSize, height: dotSize }}
          />
        )}
        <Circle
          className={`${statusColors[status]} fill-current relative z-10`}
          style={{ width: dotSize, height: dotSize }}
        />
      </span>
      {showLabel && (
        <span className={`${textSize} text-muted-foreground font-medium`}>
          {statusLabels[status]}
        </span>
      )}
    </span>
  );
};

export default StatusBadge;
