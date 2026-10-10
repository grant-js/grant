import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  clearProjectOAuthPublicInfoCacheForTests,
  getProjectAppPublicInfo,
  peekProjectAppPublicInfo,
} from './project-oauth-api';

afterEach(() => {
  clearProjectOAuthPublicInfoCacheForTests();
  vi.unstubAllGlobals();
});

describe('getProjectAppPublicInfo', () => {
  it('shares one in-flight request and can be peeked after resolve', async () => {
    const info = {
      name: 'Docs',
      projectName: 'Acme',
      pictureUrl: null,
      primaryColor: '#112233',
      showHelpPanel: false,
      themeMode: null,
      enabledProviders: ['email'],
      configuredProviders: [],
      scopes: [],
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: info }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const [first, second] = await Promise.all([
      getProjectAppPublicInfo('app_1', 'openid', 'https://app.example/cb'),
      getProjectAppPublicInfo('app_1', 'openid', 'https://app.example/cb'),
    ]);

    expect(first).toEqual(info);
    expect(second).toEqual(info);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(peekProjectAppPublicInfo('app_1', 'openid', 'https://app.example/cb')).toEqual(info);
  });
});
