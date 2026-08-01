'use client';

import { useAuthStore } from '@/stores/auth.store';

/**
 * Email verification status
 */
export type EmailVerificationStatus =
  'verified' | 'unverified-within-expiry' | 'unverified-expired';

/**
 * Hook to get the current email verification status
 *
 * @returns The verification status and related information
 *
 * @example
 * ```tsx
 * const { status, isVerified, isExpired, canVerify } = useEmailVerificationStatus();
 *
 * if (status === 'unverified-expired') {
 *   return <div>Your verification token has expired. Please request a new one.</div>;
 * }
 * ```
 */
export function useEmailVerificationStatus(): {
  status: EmailVerificationStatus;
  isVerified: boolean;
  isExpired: boolean;
  canVerify: boolean;
  verificationExpiry: Date | null;
} {
  const requiresEmailVerification = useAuthStore((state) => state.requiresEmailVerification);
  const verificationExpiry = useAuthStore((state) => state.verificationExpiry);

  // If not requiring verification, user is verified
  if (!requiresEmailVerification) {
    return {
      status: 'verified',
      isVerified: true,
      isExpired: false,
      canVerify: false,
      verificationExpiry: null,
    };
  }

  // Check if verification token has expired
  const now = new Date();
  const expiryDate = verificationExpiry ? new Date(verificationExpiry) : null;
  const isExpired = expiryDate ? expiryDate <= now : true;

  if (isExpired) {
    return {
      status: 'unverified-expired',
      isVerified: false,
      isExpired: true,
      canVerify: false, // Cannot verify with expired token
      verificationExpiry: expiryDate,
    };
  }

  return {
    status: 'unverified-within-expiry',
    isVerified: false,
    isExpired: false,
    canVerify: true, // Can verify with existing token
    verificationExpiry: expiryDate,
  };
}
