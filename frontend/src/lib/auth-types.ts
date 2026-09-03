/**
 * Student authentication domain types.
 *
 * Mirrors the Phase 1B backend contract (backend/app/schemas/student_auth.py):
 *   POST /api/auth/register {email, password, display_name?} -> token response
 *   POST /api/auth/login    {email, password}                -> token response
 *   POST /api/auth/refresh  (HttpOnly cookie, no body)       -> token response
 *   POST /api/auth/logout                                    -> 204
 *   GET  /api/auth/me                                       -> StudentUser
 *
 * Only safe profile fields are represented here. Password hashes, refresh
 * tokens, and JWT claims are never modeled on the frontend.
 */

export interface StudentUser {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
}

export interface StudentTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface StudentRegisterPayload {
  email: string;
  password: string;
  display_name?: string;
}

export interface StudentLoginPayload {
  email: string;
  password: string;
}
