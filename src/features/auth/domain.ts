/**
 * Auth domain — provider ids and session shape.
 */
export type AuthProviderId = "supabase" | "local";

export interface AuthSession {
  provider: AuthProviderId;
  email: string | null;
}
