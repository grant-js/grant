import { useMutation } from '@apollo/client/react';
import {
  SetupMfaDocument,
  VerifyMfaDocument,
  VerifyMfaRecoveryCodeDocument,
} from '@grantjs/schema';

/**
 * Wraps the 3 login-flow MFA mutations (challenge + enrollment-during-login).
 * Distinct from `useMfaMutations`, which wraps the `My*`-prefixed settings-flow
 * enrollment mutations — these operate on the authenticated user's own account
 * from the security settings page, not on an in-progress login.
 */
export function useMfaChallengeMutations() {
  const [setupMfa, { loading: settingUp }] = useMutation(SetupMfaDocument);
  const [verifyMfa, { loading: verifying }] = useMutation(VerifyMfaDocument);
  const [verifyRecoveryCode, { loading: verifyingRecovery }] = useMutation(
    VerifyMfaRecoveryCodeDocument
  );

  return {
    setupMfa,
    settingUp,
    verifyMfa,
    verifying,
    verifyRecoveryCode,
    verifyingRecovery,
  };
}
