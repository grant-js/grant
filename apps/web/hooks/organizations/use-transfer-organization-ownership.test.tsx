import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mutate = vi.fn();
const clearCache = vi.fn();
const toast = { success: vi.fn(), error: vi.fn() };

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));
vi.mock('@apollo/client/react', () => ({ useMutation: () => [mutate] }));
vi.mock('@grantjs/client/react', () => ({ useGrantClientOptional: () => ({ clearCache }) }));
vi.mock('sonner', () => ({ toast }));

const { useTransferOrganizationOwnership, getTransferErrorReason } =
  await import('./use-transfer-organization-ownership');

const input = { scope: { tenant: 'organization', id: 'org-1' }, newOwnerId: 'u2' } as never;
const refusal = (reason: string) => ({ errors: [{ extensions: { reason } }] });

beforeEach(() => {
  mutate.mockReset();
  clearCache.mockReset();
  toast.success.mockReset();
  toast.error.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('useTransferOrganizationOwnership', () => {
  it('clears the cached permission checks and reports success', async () => {
    mutate.mockResolvedValue({ data: { transferOrganizationOwnership: { ok: true } } });
    const { result } = renderHook(() => useTransferOrganizationOwnership());

    await expect(result.current.transferOwnership(input)).resolves.toEqual({ ok: true });

    expect(clearCache).toHaveBeenCalledOnce();
    expect(toast.success).toHaveBeenCalledWith('notifications.success');
  });

  it('says the caller left when they did', async () => {
    mutate.mockResolvedValue({ data: {} });
    const { result } = renderHook(() => useTransferOrganizationOwnership());

    await result.current.transferOwnership({
      ...(input as object),
      leaveOrganization: true,
    } as never);

    expect(toast.success).toHaveBeenCalledWith('notifications.successLeft');
  });

  it.each([
    ['OWNERSHIP_TRANSFER_NOT_OWNER', 'errors.notOwner'],
    ['OWNERSHIP_TRANSFER_TARGET_UNVERIFIED', 'errors.targetUnverified'],
    ['OWNERSHIP_TRANSFER_TARGET_NOT_MEMBER', 'errors.targetNotMember'],
    ['OWNERSHIP_TRANSFER_TARGET_DEACTIVATED', 'errors.targetDeactivated'],
    ['OWNERSHIP_TRANSFER_INVALID_ROLE', 'errors.invalidRole'],
    ['MFA_REQUIRED', 'errors.mfaRequired'],
  ])('shows the translated message for %s and rethrows', async (reason, key) => {
    const error = refusal(reason);
    mutate.mockRejectedValue(error);
    const { result } = renderHook(() => useTransferOrganizationOwnership());

    await expect(result.current.transferOwnership(input)).rejects.toBe(error);

    expect(toast.error).toHaveBeenCalledWith('notifications.error', { description: key });
    expect(clearCache).not.toHaveBeenCalled();
  });

  it('falls back to the error message for an unknown failure', async () => {
    mutate.mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useTransferOrganizationOwnership());

    await expect(result.current.transferOwnership(input)).rejects.toThrow();

    expect(toast.error).toHaveBeenCalledWith('notifications.error', {
      description: 'network down',
    });
  });
});

describe('getTransferErrorReason', () => {
  it('reads the first reason, and null when there is none', () => {
    expect(getTransferErrorReason(refusal('OWNERSHIP_TRANSFER_SELF'))).toBe(
      'OWNERSHIP_TRANSFER_SELF'
    );
    expect(getTransferErrorReason(new Error('x'))).toBeNull();
    expect(getTransferErrorReason({ errors: [{ extensions: {} }] })).toBeNull();
  });
});
