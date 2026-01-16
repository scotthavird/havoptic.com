/**
 * Authentication types for GitHub OAuth
 */

export interface User {
  id: string;
  github_id: number;
  github_username: string;
  github_avatar_url: string | null;
  email: string | null;
  created_at: string;
  isSubscribed: boolean;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}
