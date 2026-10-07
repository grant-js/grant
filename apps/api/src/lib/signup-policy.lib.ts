import { config } from '@/config';
import { AuthorizationError } from '@/lib/errors';

export const PUBLIC_SIGNUP_DISABLED_REASON = 'PUBLIC_SIGNUP_DISABLED';
export const LAST_HUMAN_USER_REASON = 'LAST_HUMAN_USER';

export function assertPlatformSelfSignupAllowed(params: {
  invitationProofValid: boolean;
  humanUserCount: number;
}): void {
  if (params.invitationProofValid) {
    return;
  }
  if (config.auth.publicSignupEnabled) {
    return;
  }
  if (params.humanUserCount === 0) {
    return;
  }
  throw new AuthorizationError('Public signup is disabled', PUBLIC_SIGNUP_DISABLED_REASON);
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
