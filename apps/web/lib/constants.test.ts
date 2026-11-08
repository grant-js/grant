// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest';

import { getDocsUrl } from '@/lib/constants';
import { RUNTIME_CONFIG_DEFAULTS, setRuntimeConfig } from '@/lib/runtime-config';

describe('getDocsUrl', () => {
  afterEach(() => setRuntimeConfig(RUNTIME_CONFIG_DEFAULTS));

  it('drops a trailing slash so `${getDocsUrl()}/page` has exactly one slash', () => {
    expect(getDocsUrl('https://demo.grantjs.org/docs/')).toBe('https://demo.grantjs.org/docs');
    expect(`${getDocsUrl('https://demo.grantjs.org/docs/')}/core-concepts/project-oauth`).toBe(
      'https://demo.grantjs.org/docs/core-concepts/project-oauth'
    );
  });

  it('keeps a docs URL that has no trailing slash as it is', () => {
    expect(getDocsUrl('https://docs.example.com/grant')).toBe('https://docs.example.com/grant');
  });

  it('falls back to same-origin /docs outside development when no docs URL is set', () => {
    // Node environment: no window and NODE_ENV=test, i.e. the server render of a deployed app.
    expect(getDocsUrl(null)).toBe('/docs');
  });

  it('reads the docs URL from the runtime config by default', () => {
    // Runs without a window, so getRuntimeConfig() serves the server fallback: no DOCS_URL there.
    expect(getDocsUrl()).toBe('/docs');
  });
});
