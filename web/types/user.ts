export type UserRole = "customer" | "worker";

export interface UserProfile {
  user_id: string;
  email: string | null;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  profile_exists: boolean;
}

export interface AuthSession {
  user: UserProfile | null;
  accessToken: string | null;
  isLoading: boolean;
}
