import { supabase } from "@/integrations/supabase/client";

export interface PrivacySettingsRecord {
  user_id: string;
  profile_visibility: "public" | "friends" | "private";
  status_visibility: "everyone" | "friends";
  receive_friend_requests: "everyone" | "nobody";
  receive_game_invites: "everyone" | "friends";
  receive_dms: "everyone" | "friends";
}

interface FriendshipRecord {
  requester_id: string;
  addressee_id: string;
  status: string;
}

interface BlockRecord {
  blocker_id: string;
  blocked_id: string;
}

export interface RelationshipContext {
  privacy: PrivacySettingsRecord | null;
  isFriend: boolean;
  blockedByMe: boolean;
  blockedByThem: boolean;
}

export interface ViewerRelationshipMaps {
  blockedIds: Set<string>;
  friendIds: Set<string>;
  privacyMap: Map<string, PrivacySettingsRecord>;
}

export function canReceiveFriendRequests(privacy: PrivacySettingsRecord | null) {
  return (privacy?.receive_friend_requests ?? "everyone") === "everyone";
}

export function canReceiveGameInvites(privacy: PrivacySettingsRecord | null, isFriend: boolean) {
  const setting = privacy?.receive_game_invites ?? "everyone";
  return setting === "everyone" || (setting === "friends" && isFriend);
}

export function canReceiveDirectMessages(privacy: PrivacySettingsRecord | null, isFriend: boolean) {
  const setting = privacy?.receive_dms ?? "everyone";
  return setting === "everyone" || (setting === "friends" && isFriend);
}

export function canViewProfile(privacy: PrivacySettingsRecord | null, isFriend: boolean, isSelf = false) {
  if (isSelf) return true;
  const setting = privacy?.profile_visibility ?? "public";
  return setting === "public" || (setting === "friends" && isFriend);
}

export function canViewStatus(privacy: PrivacySettingsRecord | null, isFriend: boolean, isSelf = false) {
  if (isSelf) return true;
  const setting = privacy?.status_visibility ?? "everyone";
  return setting === "everyone" || (setting === "friends" && isFriend);
}

export async function fetchRelationshipContext(currentUserId: string, otherUserId: string): Promise<RelationshipContext> {
  const [{ data: privacyData }, { data: friendshipData }, { data: blockData }] = await Promise.all([
    (supabase as any)
      .from("user_privacy_settings")
      .select("user_id, profile_visibility, status_visibility, receive_friend_requests, receive_game_invites, receive_dms")
      .eq("user_id", otherUserId)
      .maybeSingle(),
    (supabase as any)
      .from("friendships")
      .select("requester_id, addressee_id, status")
      .or(`and(requester_id.eq.${currentUserId},addressee_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},addressee_id.eq.${currentUserId})`),
    (supabase as any)
      .from("user_blocks")
      .select("blocker_id, blocked_id")
      .or(`and(blocker_id.eq.${currentUserId},blocked_id.eq.${otherUserId}),and(blocker_id.eq.${otherUserId},blocked_id.eq.${currentUserId})`),
  ]);

  const friendships = (friendshipData || []) as FriendshipRecord[];
  const blocks = (blockData || []) as BlockRecord[];

  return {
    privacy: (privacyData as PrivacySettingsRecord | null) ?? null,
    isFriend: friendships.some((friendship) => friendship.status === "accepted"),
    blockedByMe: blocks.some((block) => block.blocker_id === currentUserId && block.blocked_id === otherUserId),
    blockedByThem: blocks.some((block) => block.blocker_id === otherUserId && block.blocked_id === currentUserId),
  };
}

export async function fetchViewerRelationshipMaps(viewerUserId: string, targetUserIds: string[]): Promise<ViewerRelationshipMaps> {
  const uniqueIds = [...new Set(targetUserIds.filter(Boolean))];

  if (uniqueIds.length === 0) {
    return {
      blockedIds: new Set(),
      friendIds: new Set(),
      privacyMap: new Map(),
    };
  }

  const [{ data: privacyRows }, { data: friendships }, { data: blocks }] = await Promise.all([
    (supabase as any)
      .from("user_privacy_settings")
      .select("user_id, profile_visibility, status_visibility, receive_friend_requests, receive_game_invites, receive_dms")
      .in("user_id", uniqueIds),
    (supabase as any)
      .from("friendships")
      .select("requester_id, addressee_id, status")
      .or(`and(requester_id.eq.${viewerUserId},status.eq.accepted),and(addressee_id.eq.${viewerUserId},status.eq.accepted)`),
    (supabase as any)
      .from("user_blocks")
      .select("blocker_id, blocked_id")
      .or(`blocker_id.eq.${viewerUserId},blocked_id.eq.${viewerUserId}`),
  ]);

  const privacyMap = new Map<string, PrivacySettingsRecord>();
  (privacyRows || []).forEach((row: PrivacySettingsRecord) => {
    privacyMap.set(row.user_id, row);
  });

  const friendIds = new Set<string>();
  ((friendships || []) as FriendshipRecord[]).forEach((friendship) => {
    if (friendship.status !== "accepted") return;
    const otherId = friendship.requester_id === viewerUserId ? friendship.addressee_id : friendship.requester_id;
    if (uniqueIds.includes(otherId)) friendIds.add(otherId);
  });

  const blockedIds = new Set<string>();
  ((blocks || []) as BlockRecord[]).forEach((block) => {
    const otherId = block.blocker_id === viewerUserId ? block.blocked_id : block.blocker_id;
    if (uniqueIds.includes(otherId)) blockedIds.add(otherId);
  });

  return { blockedIds, friendIds, privacyMap };
}