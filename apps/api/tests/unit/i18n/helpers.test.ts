/**
 * Unit tests: i18n helpers (translateError, t, getLocale, translateStatic).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { HttpException } from '@/lib/errors';

import type { Request } from 'express';

const mockGetFixedT = vi.fn();
const mockConfig = vi.hoisted(() => ({
  i18n: { defaultLocale: 'en' as const },
}));

vi.mock('@/config', () => ({ config: mockConfig }));
vi.mock('@/i18n/config', () => ({
  defaultLocale: 'en',
  getFixedT: (locale: string) => mockGetFixedT(locale),
}));

describe('i18n helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFixedT.mockReturnValue((key: string, params?: Record<string, unknown>) =>
      params && Object.keys(params).length > 0
        ? `translated:${key}:${JSON.stringify(params)}`
        : `translated:${key}`
    );
  });

  describe('translateError', () => {
    it('returns translated message when error has translationKey and req.i18n exists', async () => {
      const { translateError } = await import('@/i18n/helpers');
      const req = {
        i18n: { t: vi.fn((key: string) => `Localized: ${key}`) },
      } as unknown as Request;
      const error = {
        message: 'Fallback',
        translationKey: 'errors.auth.notAuthenticated',
        translationParams: undefined,
      };
      expect(translateError(req, error as unknown as HttpException)).toBe(
        'Localized: errors.auth.notAuthenticated'
      );
    });

    it('passes translationParams to t when present', async () => {
      const { translateError } = await import('@/i18n/helpers');
      const t = vi.fn(
        (key: string, params: Record<string, string>) =>
          `Localized: ${key} ${params?.organizationId ?? ''}`
      );
      const req = { i18n: { t } } as unknown as Request;
      const error = {
        message: 'Fallback',
        translationKey: 'errors.notFound.organization',
        translationParams: { organizationId: 'org-1' },
      };
      expect(translateError(req, error as unknown as HttpException)).toBe(
        'Localized: errors.notFound.organization org-1'
      );
      expect(t).toHaveBeenCalledWith('errors.notFound.organization', { organizationId: 'org-1' });
    });

    it('returns error.message when translationKey is missing', async () => {
      const { translateError } = await import('@/i18n/helpers');
      const req = { i18n: { t: vi.fn() } } as unknown as Request;
      const error = { message: 'Plain message', translationKey: undefined };
      expect(translateError(req, error as unknown as HttpException)).toBe('Plain message');
    });

    it('returns error.message when req.i18n is missing', async () => {
      const { translateError } = await import('@/i18n/helpers');
      const req = {} as Request;
      const error = { message: 'No i18n', translationKey: 'errors.auth.forbidden' };
      expect(translateError(req, error as unknown as HttpException)).toBe('No i18n');
    });
  });

  describe('t', () => {
    it('returns req.i18n.t(key, params) when i18n exists', async () => {
      const { t } = await import('@/i18n/helpers');
      const req = {
        i18n: { t: vi.fn((key: string) => `T:${key}`) },
      } as unknown as Request;
      expect(t(req, 'common.welcome')).toBe('T:common.welcome');
    });

    it('returns key when req.i18n is missing', async () => {
      const { t } = await import('@/i18n/helpers');
      const req = {} as Request;
      expect(t(req, 'common.welcome')).toBe('common.welcome');
    });
  });

  describe('getLocale', () => {
    it('returns req.i18n.language when present', async () => {
      const { getLocale } = await import('@/i18n/helpers');
      const req = { i18n: { language: 'de' } } as unknown as Request;
      expect(getLocale(req)).toBe('de');
    });

    it('returns defaultLocale when req.i18n is missing', async () => {
      const { getLocale } = await import('@/i18n/helpers');
      const req = {} as Request;
      expect(getLocale(req)).toBe('en');
    });
  });

  describe('translateStatic', () => {
    it('returns getFixedT(locale)(key, params)', async () => {
      const { translateStatic } = await import('@/i18n/helpers');
      expect(translateStatic('errors.auth.forbidden', 'de')).toBe(
        'translated:errors.auth.forbidden'
      );
      expect(mockGetFixedT).toHaveBeenCalledWith('de');
    });

    it('uses defaultLocale when locale not provided', async () => {
      const { translateStatic } = await import('@/i18n/helpers');
      translateStatic('common.save');
      expect(mockGetFixedT).toHaveBeenCalledWith('en');
    });
  });
});
