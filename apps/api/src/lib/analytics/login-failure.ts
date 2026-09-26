import type { SessionFailureReason } from '@grantjs/core';

import { AuthenticationError } from '@/lib/errors';

const LOGIN_FAILURE_REASONS: Readonly<Record<string, SessionFailureReason>> = {
  'User authentication method not found': 'credentials',
  'Invalid credentials': 'credentials',
  'User not verified': 'unverified',
};

export function loginFailureReason(error: unknown): SessionFailureReason | null {
  if (!(error instanceof AuthenticationError)) {
    return null;
  }
  return LOGIN_FAILURE_REASONS[error.message] ?? null;
}
