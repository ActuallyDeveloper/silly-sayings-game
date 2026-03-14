import { useStatus } from "@/contexts/StatusContext";
import StatusIndicator from "@/components/StatusIndicator";

/**
 * Shows a live status dot for any user ID, respecting their privacy settings.
 * Use `self` to show the current user's own status.
 */
interface UserStatusDotProps {
  userId?: string;
  /** If true, shows the current user's own status regardless of privacy */
  self?: boolean;
  size?: number;
}

const UserStatusDot = ({ userId, self, size = 8 }: UserStatusDotProps) => {
  const { myStatus, getStatusWithPrivacy } = useStatus();

  if (self) {
    return <StatusIndicator status={myStatus} size={size} />;
  }

  if (!userId) return null;

  const { status, canView } = getStatusWithPrivacy(userId);
  if (!canView) return null;

  return <StatusIndicator status={status} size={size} />;
};

export default UserStatusDot;
