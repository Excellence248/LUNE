/** Types for the admin API. Requests use the shared client, which checks the session on the server. */

export { ApiError, api } from '@/lib/api';

export interface AdminMe {
  id: string;
  username: string;
  permissions: string[];
}

export interface Page<T> {
  items: T[];
  hasMore: boolean;
}

export interface Stats {
  followers: number;
  following: number;
  posts: number;
  replies: number;
  reposts: number;
  likes_given: number;
  likes_received: number;
  reposts_received: number;
}

export type BadgeTier = 'blue' | 'gold';

export interface Member {
  id: string;
  username: string;
  avatar_url: string;
  created_at: string;
  stats: Stats;
  is_admin: boolean;
  suspension: { reason: string; created_at: string; expires_at: string | null } | null;
  badge: BadgeTier | null;
  badge_expires_at: string | null;
  email: string | null;
}

export interface ContentItem {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  post_id: string | null;
  author: { id: string; username: string };
  likes?: number;
  reposts?: number;
  replies?: number;
}

export interface Overview {
  members: number;
  new_members_7d: number;
  admins: number;
  suspended: number;
  posts: number;
  posts_7d: number;
  replies: number;
  likes: number;
  reposts: number;
  follows: number;
}

export interface AuditEntry {
  id: string;
  action: 'suspend' | 'reinstate' | 'remove_post' | 'remove_reply' | 'grant_badge' | 'revoke_badge';
  reason: string;
  details: { content?: string; expires_at?: string | null; tier?: BadgeTier | null };
  created_at: string;
  admin_username: string | null;
  target_profile_id: string | null;
  target_username: string | null;
}

export const formatCount = (value: number) => new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
export const formatDate = (value: string) => new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
