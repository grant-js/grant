import { MILLISECONDS_PER_DAY } from '@grantjs/constants';

import { config } from '@/config';

export function getVerificationExpirationMs(): number {
  return config.auth.providerVerificationExpirationDays * MILLISECONDS_PER_DAY;
}

export function getVerificationExpiryDate(from: Date): Date {
  return new Date(from.getTime() + getVerificationExpirationMs());
}
