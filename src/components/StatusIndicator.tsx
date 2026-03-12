import { Circle } from "lucide-react";
import type { UserStatusType } from "@/hooks/useUserStatus";

const statusColors: Record<UserStatusType, string> = {
  available: "text-green-500",
  away: "text-yellow-500",
  busy: "text-red-500",
  invisible: "text-muted-foreground/30",
};

const statusLabels: Record<UserStatusType, string> = {
  available: "Available",
  away: "Away",
  busy: "Busy",
  invisible: "Invisible",
};

interface StatusIndicatorProps {
  status: UserStatusType;
  size?: number;
  showLabel?: boolean;
}

const StatusIndicator = ({ status, size = 10, showLabel = false }: StatusIndicatorProps) => (
  <span className="inline-flex items-center gap-1">
    <Circle className={`${statusColors[status]} fill-current`} style={{ width: size, height: size }} />
    {showLabel && <span className="text-xs text-muted-foreground">{statusLabels[status]}</span>}
  </span>
);

export default StatusIndicator;
export { statusColors, statusLabels };
