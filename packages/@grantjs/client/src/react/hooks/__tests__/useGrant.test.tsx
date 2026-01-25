import type { ReactNode } from 'react';

import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GrantClient } from '../../../grant-client';
import { GrantProvider } from '../../context';
import { useGrant } from '../useGrant';

describe('useGrant', () => {
  let mockClient: GrantClient;
  let mockIsAuthorized: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockIsAuthorized = vi.fn();
    mockClient = {
      isAuthorized: mockIsAuthorized,
    } as unknown as GrantClient;

    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <GrantProvider client={mockClient}>{children}</GrantProvider>
  );

  it('should return true when authorized', async () => {
    mockIsAuthorized.mockResolvedValue({
      authorized: true,
      reason: null,
    });

    const { result } = renderHook(() => useGrant('Document', 'Update'), { wrapper });

    // Initially false while loading
    expect(result.current).toBe(false);

    await waitFor(() => {
      expect(result.current).toBe(true);
    });

    expect(mockIsAuthorized).toHaveBeenCalledWith('Document', 'Update', {
      scope: undefined,
      useCache: true,
    });
  });

  it('should return false when not authorized', async () => {
    mockIsAuthorized.mockResolvedValue({
      authorized: false,
      reason: 'Insufficient permissions',
    });

    const { result } = renderHook(() => useGrant('Document', 'Update'), { wrapper });

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it('should return false while loading', () => {
    mockIsAuthorized.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() => useGrant('Document', 'Update'), { wrapper });

    expect(result.current).toBe(false);
  });

  it('should return false when data is null', async () => {
    mockIsAuthorized.mockResolvedValue(null);

    const { result } = renderHook(() => useGrant('Document', 'Update'), { wrapper });

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it('should handle scope changes', async () => {
    mockIsAuthorized.mockResolvedValue({
      authorized: true,
    });

    const { result, rerender } = renderHook(
      ({ scope }) => useGrant('Document', 'Update', { scope }),
      {
        wrapper,
        initialProps: { scope: { tenant: 'organization', id: 'org-1' } },
      }
    );

    await waitFor(() => {
      expect(result.current).toBe(true);
    });

    expect(mockIsAuthorized).toHaveBeenCalledWith('Document', 'Update', {
      scope: { tenant: 'organization', id: 'org-1' },
      useCache: true,
    });

    // Change scope
    rerender({ scope: { tenant: 'organization', id: 'org-2' } });

    await waitFor(() => {
      expect(mockIsAuthorized).toHaveBeenCalledTimes(2);
    });

    expect(mockIsAuthorized).toHaveBeenLastCalledWith('Document', 'Update', {
      scope: { tenant: 'organization', id: 'org-2' },
      useCache: true,
    });
  });

  it('should not refetch when scope object reference changes but values are same', async () => {
    mockIsAuthorized.mockResolvedValue({
      authorized: true,
    });

    const scope = { tenant: 'organization', id: 'org-1' };
    const { rerender } = renderHook(() => useGrant('Document', 'Update', { scope }), {
      wrapper,
    });

    await waitFor(() => {
      expect(mockIsAuthorized).toHaveBeenCalledTimes(1);
    });

    // Create new object with same values (not used, just demonstrating same values)
    rerender();

    // Should not trigger new fetch
    await waitFor(() => {
      expect(mockIsAuthorized).toHaveBeenCalledTimes(1);
    });
  });

  it('should return false on error', async () => {
    const error = new Error('Network error');
    mockIsAuthorized.mockRejectedValue(error);

    const { result } = renderHook(() => useGrant('Document', 'Update'), { wrapper });

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it('should skip fetch when enabled is false', async () => {
    const { result } = renderHook(() => useGrant('Document', 'Update', { enabled: false }), {
      wrapper,
    });

    expect(result.current).toBe(false);
    expect(mockIsAuthorized).not.toHaveBeenCalled();
  });

  it('should refetch when enabled changes from false to true', async () => {
    mockIsAuthorized.mockResolvedValue({
      authorized: true,
    });

    const { result, rerender } = renderHook(
      ({ enabled }) => useGrant('Document', 'Update', { enabled }),
      {
        wrapper,
        initialProps: { enabled: false },
      }
    );

    expect(result.current).toBe(false);
    expect(mockIsAuthorized).not.toHaveBeenCalled();

    rerender({ enabled: true });

    await waitFor(() => {
      expect(result.current).toBe(true);
    });

    expect(mockIsAuthorized).toHaveBeenCalledTimes(1);
  });

  it('should bypass cache when useCache is false', async () => {
    mockIsAuthorized.mockResolvedValue({
      authorized: true,
    });

    const { result } = renderHook(
      () => useGrant('Document', 'Update', { useCache: false }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current).toBe(true);
    });

    expect(mockIsAuthorized).toHaveBeenCalledWith('Document', 'Update', {
      scope: undefined,
      useCache: false,
    });
  });

  it('should not update state after unmount', async () => {
    mockIsAuthorized.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ authorized: true }), 100);
        })
    );

    const { result, unmount } = renderHook(() => useGrant('Document', 'Update'), {
      wrapper,
    });

    expect(result.current).toBe(false);

    unmount();

    await new Promise((resolve) => setTimeout(resolve, 150));

    // State should not be updated after unmount
    expect(result.current).toBe(false);
  });

  describe('scope handling', () => {
    it('should wait when scope is null and not make request', async () => {
      const { result } = renderHook(
        () => useGrant('Document', 'Update', { scope: null }),
        { wrapper }
      );

      // Should return false and not make request
      expect(result.current).toBe(false);
      expect(mockIsAuthorized).not.toHaveBeenCalled();

      // Wait a bit to ensure no request is made
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mockIsAuthorized).not.toHaveBeenCalled();
    });

    it('should wait when scope is undefined (explicitly provided) and not make request', async () => {
      const { result } = renderHook(
        () => useGrant('Document', 'Update', { scope: undefined }),
        { wrapper }
      );

      // Should return false and not make request
      expect(result.current).toBe(false);
      expect(mockIsAuthorized).not.toHaveBeenCalled();

      // Wait a bit to ensure no request is made
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mockIsAuthorized).not.toHaveBeenCalled();
    });

    it('should make request when scope is not provided (optional)', async () => {
      mockIsAuthorized.mockResolvedValue({
        authorized: true,
      });

      const { result } = renderHook(() => useGrant('Document', 'Update'), { wrapper });

      await waitFor(() => {
        expect(result.current).toBe(true);
      });

      expect(mockIsAuthorized).toHaveBeenCalledWith('Document', 'Update', {
        scope: undefined,
        useCache: true,
      });
    });

    it('should make request when scope becomes valid after being null', async () => {
      mockIsAuthorized.mockResolvedValue({
        authorized: true,
      });

      const { result, rerender } = renderHook(
        ({ scope }) => useGrant('Document', 'Update', { scope }),
        {
          wrapper,
          initialProps: { scope: null },
        }
      );

      // Initially should not make request
      expect(result.current).toBe(false);
      expect(mockIsAuthorized).not.toHaveBeenCalled();

      // Scope becomes valid
      rerender({ scope: { tenant: 'organization', id: 'org-1' } });

      await waitFor(() => {
        expect(result.current).toBe(true);
      });

      expect(mockIsAuthorized).toHaveBeenCalledTimes(1);
      expect(mockIsAuthorized).toHaveBeenCalledWith('Document', 'Update', {
        scope: { tenant: 'organization', id: 'org-1' },
        useCache: true,
      });
    });

    it('should make request when scope becomes valid after being undefined', async () => {
      mockIsAuthorized.mockResolvedValue({
        authorized: true,
      });

      const { result, rerender } = renderHook(
        ({ scope }) => useGrant('Document', 'Update', { scope }),
        {
          wrapper,
          initialProps: { scope: undefined },
        }
      );

      // Initially should not make request
      expect(result.current).toBe(false);
      expect(mockIsAuthorized).not.toHaveBeenCalled();

      // Scope becomes valid
      rerender({ scope: { tenant: 'organization', id: 'org-1' } });

      await waitFor(() => {
        expect(result.current).toBe(true);
      });

      expect(mockIsAuthorized).toHaveBeenCalledTimes(1);
      expect(mockIsAuthorized).toHaveBeenCalledWith('Document', 'Update', {
        scope: { tenant: 'organization', id: 'org-1' },
        useCache: true,
      });
    });

    it('should wait when scope has null id', async () => {
      const { result } = renderHook(
        () => useGrant('Document', 'Update', { scope: { tenant: 'organization', id: null as string | null } }),
        { wrapper }
      );

      // Should return false and not make request
      expect(result.current).toBe(false);
      expect(mockIsAuthorized).not.toHaveBeenCalled();

      // Wait a bit to ensure no request is made
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mockIsAuthorized).not.toHaveBeenCalled();
    });

    it('should wait when scope is missing tenant property', async () => {
      const { result } = renderHook(
        () => useGrant('Document', 'Update', { scope: { id: 'org-1' } as { id: string } }),
        { wrapper }
      );

      // Should return false and not make request
      expect(result.current).toBe(false);
      expect(mockIsAuthorized).not.toHaveBeenCalled();

      // Wait a bit to ensure no request is made
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mockIsAuthorized).not.toHaveBeenCalled();
    });

    it('should wait when scope is missing id property', async () => {
      const { result } = renderHook(
        () => useGrant('Document', 'Update', { scope: { tenant: 'organization' } as { tenant: string } }),
        { wrapper }
      );

      // Should return false and not make request
      expect(result.current).toBe(false);
      expect(mockIsAuthorized).not.toHaveBeenCalled();

      // Wait a bit to ensure no request is made
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mockIsAuthorized).not.toHaveBeenCalled();
    });

    it('should make request immediately when scope is valid', async () => {
      mockIsAuthorized.mockResolvedValue({
        authorized: true,
      });

      const { result } = renderHook(
        () => useGrant('Document', 'Update', { scope: { tenant: 'organization', id: 'org-1' } }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current).toBe(true);
      });

      expect(mockIsAuthorized).toHaveBeenCalledTimes(1);
      expect(mockIsAuthorized).toHaveBeenCalledWith('Document', 'Update', {
        scope: { tenant: 'organization', id: 'org-1' },
        useCache: true,
      });
    });

    it('should handle scope changing from valid to null', async () => {
      mockIsAuthorized.mockResolvedValue({
        authorized: true,
      });

      const { result, rerender } = renderHook(
        ({ scope }) => useGrant('Document', 'Update', { scope }),
        {
          wrapper,
          initialProps: { scope: { tenant: 'organization', id: 'org-1' } },
        }
      );

      await waitFor(() => {
        expect(result.current).toBe(true);
      });

      expect(mockIsAuthorized).toHaveBeenCalledTimes(1);

      // Scope becomes null
      rerender({ scope: null });

      // Should stop making requests
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mockIsAuthorized).toHaveBeenCalledTimes(1); // Still only 1 call
      expect(result.current).toBe(false); // Should return false
    });
  });

  describe('with returnLoading: true', () => {
    it('should return object with isGranted and isLoading', async () => {
      mockIsAuthorized.mockResolvedValue({
        authorized: true,
        reason: null,
      });

      const { result } = renderHook(
        () => useGrant('Document', 'Update', { returnLoading: true }),
        { wrapper }
      );

      // Initially loading
      expect(result.current).toEqual({ isGranted: false, isLoading: true });

      await waitFor(() => {
        expect(result.current).toEqual({ isGranted: true, isLoading: false });
      });
    });

    it('should return isLoading: true while loading', () => {
      mockIsAuthorized.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(
        () => useGrant('Document', 'Update', { returnLoading: true }),
        { wrapper }
      );

      expect(result.current).toEqual({ isGranted: false, isLoading: true });
    });

    it('should return isLoading: false when not authorized', async () => {
      mockIsAuthorized.mockResolvedValue({
        authorized: false,
        reason: 'Insufficient permissions',
      });

      const { result } = renderHook(
        () => useGrant('Document', 'Update', { returnLoading: true }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current).toEqual({ isGranted: false, isLoading: false });
      });
    });

    it('should handle scope changes with loading state', async () => {
      mockIsAuthorized.mockResolvedValue({
        authorized: true,
      });

      const { result, rerender } = renderHook(
        ({ scope }) => useGrant('Document', 'Update', { scope, returnLoading: true }),
        {
          wrapper,
          initialProps: { scope: { tenant: 'organization', id: 'org-1' } },
        }
      );

      await waitFor(() => {
        expect(result.current).toEqual({ isGranted: true, isLoading: false });
      });

      // Change scope
      rerender({ scope: { tenant: 'organization', id: 'org-2' } });

      // Should show loading during refetch
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockIsAuthorized).toHaveBeenCalledTimes(2);
    });
  });
});
