import type { ApolloClient } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import {
  CreateMyMfaEnrollmentDocument,
  RemoveMyMfaDeviceDocument,
  SetMyPrimaryMfaDeviceDocument,
  VerifyMyMfaEnrollmentDocument,
} from '@grantjs/schema';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useMfaMutations } from './use-mfa-mutations';

vi.mock('@apollo/client/react', () => ({
  useMutation: vi.fn(),
}));

/** Matches Apollo `MutationResult` fields `useMfaMutations` does not read (hook only uses mutate fn return values). */
function idleMutationResult(): {
  data: undefined;
  loading: false;
  error: undefined;
  called: boolean;
  client: ApolloClient;
  reset: () => void;
} {
  return {
    data: undefined,
    loading: false,
    error: undefined,
    called: false,
    client: {} as ApolloClient,
    reset: vi.fn(),
  };
}

type VerifyEnrollmentMutateResult = {
  data?: { verifyMyMfaEnrollment: { success: boolean } };
  errors?: Array<{ message: string; extensions: { code: string; reason: string } }>;
};

describe('useMfaMutations', () => {
  const createMutate = vi.fn(async () => ({
    data: {
      createMyMfaEnrollment: {
        factorId: 'factor-1',
        secret: 'SECRET',
        otpAuthUrl: 'otpauth://test',
      },
    },
  }));
  const verifyMutate = vi.fn(async (): Promise<VerifyEnrollmentMutateResult> => ({
    data: { verifyMyMfaEnrollment: { success: true } },
  }));
  const setPrimaryMutate = vi.fn(async () => ({
    data: {
      setMyPrimaryMfaDevice: {
        id: 'factor-1',
        isPrimary: true,
        isEnabled: true,
      },
    },
  }));
  const removeMutate = vi.fn(async () => ({
    data: { removeMyMfaDevice: { success: true } },
  }));

  beforeEach(() => {
    createMutate.mockClear();
    verifyMutate.mockClear();
    setPrimaryMutate.mockClear();
    removeMutate.mockClear();

    vi.mocked(useMutation).mockImplementation((doc: unknown) => {
      if (doc === CreateMyMfaEnrollmentDocument) {
        return [createMutate, idleMutationResult()] as ReturnType<typeof useMutation>;
      }
      if (doc === VerifyMyMfaEnrollmentDocument) {
        return [verifyMutate, idleMutationResult()] as ReturnType<typeof useMutation>;
      }
      if (doc === SetMyPrimaryMfaDeviceDocument) {
        return [setPrimaryMutate, idleMutationResult()] as ReturnType<typeof useMutation>;
      }
      if (doc === RemoveMyMfaDeviceDocument) {
        return [removeMutate, idleMutationResult()] as ReturnType<typeof useMutation>;
      }
      throw new Error(`Unexpected document in useMutation mock: ${String(doc)}`);
    });
  });

  it('createEnrollment uses CreateMyMfaEnrollmentDocument and returns payload', async () => {
    const { result } = renderHook(() => useMfaMutations());
    const enrollment = await result.current.createEnrollment();
    expect(enrollment?.factorId).toBe('factor-1');
    expect(enrollment?.secret).toBe('SECRET');
  });

  it('verifyEnrollment passes code in variables and returns true on success', async () => {
    const { result } = renderHook(() => useMfaMutations());
    const ok = await result.current.verifyEnrollment('123456');
    expect(ok).toBe(true);
    expect(verifyMutate).toHaveBeenCalledWith({ variables: { input: { code: '123456' } } });
  });

  it('verifyEnrollment returns false when MFA_REQUIRED (no data)', async () => {
    verifyMutate.mockImplementationOnce(async () => ({
      data: undefined,
      errors: [{ message: 'Forbidden', extensions: { code: 'FORBIDDEN', reason: 'MFA_REQUIRED' } }],
    }));

    const { result } = renderHook(() => useMfaMutations());
    const ok = await result.current.verifyEnrollment('999999');
    expect(ok).toBe(false);
  });

  it('setPrimaryDevice and removeDevice call mutations with factor id', async () => {
    const { result } = renderHook(() => useMfaMutations());
    await result.current.setPrimaryDevice('fid');
    await result.current.removeDevice('fid');

    expect(setPrimaryMutate).toHaveBeenCalledWith({ variables: { input: { factorId: 'fid' } } });
    expect(removeMutate).toHaveBeenCalledWith({ variables: { input: { factorId: 'fid' } } });
  });
});
