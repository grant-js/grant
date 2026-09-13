'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';

import { DirectUploadError, type DirectUploadFailure } from '@/lib/direct-upload';

/**
 * One message per failure kind, so the three upload targets say the same thing about
 * the same problem.
 *
 * `Record<DirectUploadFailure, string>` rather than a lookup with a fallback: a new
 * failure kind added to the lib without a message here is a type error, not a user
 * silently reading "something went wrong".
 */
const MESSAGE_KEYS: Record<DirectUploadFailure, string> = {
  expired: 'errors.expired',
  aborted: 'errors.cancelled',
  network: 'errors.network',
  rejected: 'errors.rejected',
  unclaimed: 'errors.unclaimed',
};

/**
 * Turns a direct-upload failure into something worth showing a user.
 *
 * The lib's own messages name the mechanism for a developer reading a stack trace.
 * They are not translated and must not be rendered — which is why `DirectUploadError`
 * carries a `failure` to switch on instead.
 */
export function useDirectUploadMessage(): (error: unknown) => string {
  const t = useTranslations('common.upload');

  return useCallback(
    (error: unknown) =>
      error instanceof DirectUploadError ? t(MESSAGE_KEYS[error.failure]) : t('errors.unknown'),
    [t]
  );
}
