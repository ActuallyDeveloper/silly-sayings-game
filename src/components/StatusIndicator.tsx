import type { UserStatusType } from "@/contexts/StatusContext";

const statusColors: Record<UserStatusType, string> = {
  available: "#22c55e",
  away: "#eab308",
  busy: "#ef4444",
  invisible: "transparent",
};

const statusBorderColors: Record<UserStatusType, string> = {
  available: "#22c55e",
  away: "#eab308",
  busy: "#ef4444",
  invisible: "hsl(var(--muted-foreground) / 0.3)",
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
  <span className="inline-flex items-center gap-1 shrink-0">
    <span
      aria-label={statusLabels[status]}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: statusColors[status],
        border: `1.5px solid ${statusBorderColors[status]}`,
        display: "inline-block",
        flexShrink: 0,
      }}
    />
    {showLabel && (
      <span className="text-xs text-muted-foreground">{statusLabels[status]}</span>
    )}
  </span>
);

export default StatusIndicator;
export { statusColors, statusBorderColors, statusLabels };
