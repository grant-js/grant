import { config } from '@/config';
import { AuthorizationError } from '@/lib/errors';

export const PUBLIC_SIGNUP_DISABLED_REASON = 'PUBLIC_SIGNUP_DISABLED';
export const LAST_HUMAN_USER_REASON = 'LAST_HUMAN_USER';

/**
 * Whether the platform may create a first account for an identity that has none:
 * a registration, or a login by an identity that reached the platform without one.
 * One rule for both, so a closed install cannot be entered through the door that
 * is not guarded.
 */
export function isPlatformSelfSignupAllowed(params: {
  invitationProofValid: boolean;
  humanUserCount: number;
}): boolean {
  return (
    params.invitationProofValid || config.auth.publicSignupEnabled || params.humanUserCount === 0
  );
}

export function assertPlatformSelfSignupAllowed(params: {
  invitationProofValid: boolean;
  humanUserCount: number;
}): void {
  if (!isPlatformSelfSignupAllowed(params)) {
    throw new AuthorizationError('Public signup is disabled', PUBLIC_SIGNUP_DISABLED_REASON);
  }
}

export function assertNotLastHumanUser(params: {
  userId: string;
  systemUserId: string;
  humanUserCount: number;
}): void {
  if (params.userId === params.systemUserId) {
    return;
  }
  if (params.humanUserCount > 1) {
    return;
  }
  throw new AuthorizationError('Cannot delete the last human user', LAST_HUMAN_USER_REASON);
}
