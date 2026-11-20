export interface CommunitySummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  avatar_url: string;
  cover_url: string;
  created_at: string;
  member_count: number;
  viewer_role: 'owner' | 'member' | null;
}

export interface CommunityDetails extends CommunitySummary {
  rules: string;
  owner_id: string;
  owner: { id: string; username: string; display_name?: string; avatar_url: string };
}

export interface CommunityMember {
  id: string;
  username: string;
  display_name?: string;
  avatar_url: string;
  role: 'owner' | 'member';
  joined_at: string;
}

/** A web address suggestion from a name: lowercase letters, numbers and dashes. */
export const slugFromName = (name: string) =>
  name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
