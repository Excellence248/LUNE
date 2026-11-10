import { ApiError } from '@/lib/api';

/** Turns Neon Auth and API errors into messages a member can act on. */
export const authErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    if (error.code === 'INVALID_EMAIL_OR_PASSWORD') return 'The email or password is incorrect. Please try again.';
    if (error.code === 'EMAIL_NOT_VERIFIED') return 'Confirm your email before logging in. You can request a new confirmation email below.';
    if (error.code === 'USER_ALREADY_EXISTS' || error.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL') return 'An account with this email already exists. Sign in instead.';
    if (error.code === 'PASSWORD_TOO_SHORT') return 'Choose a password with at least 8 characters.';
    if (error.code === 'INVALID_TOKEN') return 'This link is expired or has already been used. Request a new one.';
    if (error.status === 429) return 'Too many attempts. Wait a few minutes, then try again.';
    if (error.status === 0) return 'The account service could not be reached. Check your connection and try again.';
  }
  return error instanceof Error && error.message ? error.message : 'The account request could not be completed. Please try again.';
};
