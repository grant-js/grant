import { describe, expect, it } from 'vitest';

import { refreshSessionRequestSchema } from '@/rest/schemas';

describe('refreshSessionRequestSchema', () => {
  it('accepts an empty or missing body so cookie-only browser refresh still works', async () => {
    await expect(refreshSessionRequestSchema.parseAsync(undefined)).resolves.toEqual({});
    await expect(refreshSessionRequestSchema.parseAsync({})).resolves.toEqual({});
  });

  it('accepts an optional refreshToken for CLI clients', async () => {
    await expect(refreshSessionRequestSchema.parseAsync({ refreshToken: 'rt-1' })).resolves.toEqual(
      { refreshToken: 'rt-1' }
    );
  });

  it('rejects an empty refreshToken string', async () => {
    await expect(refreshSessionRequestSchema.parseAsync({ refreshToken: '' })).rejects.toThrow();
  });
});
