// @vitest-environment jsdom

import { createElement } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RuntimeConfigProvider, useRuntimeConfig } from './runtime-config-provider';

function Probe() {
  const { appVersion, docsUrl, apiReferenceEnabled, graphqlPlaygroundEnabled } = useRuntimeConfig();
  return createElement(
    'output',
    null,
    JSON.stringify({ appVersion, docsUrl, apiReferenceEnabled, graphqlPlaygroundEnabled })
  );
}

function renderWithConfig(payload: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(payload) })
  );
  render(createElement(RuntimeConfigProvider, null, createElement(Probe)));
}

const read = () => JSON.parse(screen.getByRole('status').textContent ?? '{}');

describe('RuntimeConfigProvider', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('starts with the API links hidden and no docs URL', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})));
    render(createElement(RuntimeConfigProvider, null, createElement(Probe)));

    expect(read()).toEqual({
      appVersion: 'dev',
      docsUrl: null,
      apiReferenceEnabled: false,
      graphqlPlaygroundEnabled: false,
    });
  });

  it('takes the docs URL and surface flags from /api/config', async () => {
    renderWithConfig({
      appVersion: '1.27.0',
      docsUrl: 'https://demo.grantjs.org/docs/',
      apiReferenceEnabled: true,
      graphqlPlaygroundEnabled: false,
    });

    await waitFor(() =>
      expect(read()).toEqual({
        appVersion: '1.27.0',
        docsUrl: 'https://demo.grantjs.org/docs/',
        apiReferenceEnabled: true,
        graphqlPlaygroundEnabled: false,
      })
    );
  });

  it('keeps the links hidden when an older API omits the flags', async () => {
    renderWithConfig({ appVersion: '1.26.0', docsUrl: '  ' });

    // Wait for the payload to land (appVersion changes), then check the new fields defaulted.
    await waitFor(() => expect(read().appVersion).toBe('1.26.0'));
    expect(read()).toEqual({
      appVersion: '1.26.0',
      docsUrl: null,
      apiReferenceEnabled: false,
      graphqlPlaygroundEnabled: false,
    });
  });
});
