import type { ReactNode } from 'react';

import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GrantClient } from '../../grant-client';
import { GrantProvider, useGrantClient, useGrantClientOptional } from '../context';

describe('GrantProvider and Context', () => {
  describe('GrantProvider', () => {
    it('should create client from config', () => {
      const config = {
        apiUrl: 'https://api.example.com',
        getAccessToken: () => 'token',
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <GrantProvider config={config}>{children}</GrantProvider>
      );

      const { result } = renderHook(() => useGrantClient(), { wrapper });

      expect(result.current).toBeInstanceOf(GrantClient);
    });

    it('should use pre-configured client when provided', () => {
      const preConfiguredClient = new GrantClient({
        apiUrl: 'https://api.example.com',
      });

      const wrapper = ({ children }: { children: ReactNode }) => (
        <GrantProvider client={preConfiguredClient}>{children}</GrantProvider>
      );

      const { result } = renderHook(() => useGrantClient(), { wrapper });

      expect(result.current).toBe(preConfiguredClient);
    });

    it('should prefer client over config when both provided', () => {
      const preConfiguredClient = new GrantClient({
        apiUrl: 'https://api.example.com',
      });

      const config = {
        apiUrl: 'https://different-api.com',
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <GrantProvider config={config} client={preConfiguredClient}>
          {children}
        </GrantProvider>
      );

      const { result } = renderHook(() => useGrantClient(), { wrapper });

      expect(result.current).toBe(preConfiguredClient);
    });

    it('should memoize client instance', () => {
      const config = {
        apiUrl: 'https://api.example.com',
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <GrantProvider config={config}>{children}</GrantProvider>
      );

      const { result, rerender } = renderHook(() => useGrantClient(), { wrapper });

      const firstClient = result.current;

      rerender();

      expect(result.current).toBe(firstClient); // Same instance
    });
  });

  describe('useGrantClient', () => {
    it('should return client from context', () => {
      const client = new GrantClient({
        apiUrl: 'https://api.example.com',
      });

      const wrapper = ({ children }: { children: ReactNode }) => (
        <GrantProvider client={client}>{children}</GrantProvider>
      );

      const { result } = renderHook(() => useGrantClient(), { wrapper });

      expect(result.current).toBe(client);
    });

    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useGrantClient());
      }).toThrow('useGrantClient must be used within a GrantProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('useGrantClientOptional', () => {
    it('should return client when in provider', () => {
      const client = new GrantClient({
        apiUrl: 'https://api.example.com',
      });

      const wrapper = ({ children }: { children: ReactNode }) => (
        <GrantProvider client={client}>{children}</GrantProvider>
      );

      const { result } = renderHook(() => useGrantClientOptional(), { wrapper });

      expect(result.current).toBe(client);
    });

    it('should return null when not in provider', () => {
      const { result } = renderHook(() => useGrantClientOptional());

      expect(result.current).toBeNull();
    });
  });
});
