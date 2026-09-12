import { describe, expect, it } from 'vitest';

import {
  normalizeOauthPictureUrl,
  oauthPictureUrlFromProviderData,
  userPictureUrlIsEmpty,
} from '@/lib/oauth-picture.lib';

describe('oauth-picture', () => {
  it('accepts https Google userinfo pictures', () => {
    expect(
      normalizeOauthPictureUrl('https://lh3.googleusercontent.com/a/ACg8ocExample=s96-c')
    ).toBe('https://lh3.googleusercontent.com/a/ACg8ocExample=s96-c');
  });

  it('prefixes protocol-relative picture URLs', () => {
    expect(normalizeOauthPictureUrl('//lh3.googleusercontent.com/a/photo')).toBe(
      'https://lh3.googleusercontent.com/a/photo'
    );
  });

  it('reads nested { url } shapes', () => {
    expect(normalizeOauthPictureUrl({ url: 'https://example.com/p.png' })).toBe(
      'https://example.com/p.png'
    );
  });

  it('rejects non-http values and overlong URLs', () => {
    expect(normalizeOauthPictureUrl('ftp://example.com/p.png')).toBeNull();
    expect(normalizeOauthPictureUrl('not-a-url')).toBeNull();
    expect(normalizeOauthPictureUrl(`https://example.com/${'a'.repeat(500)}`)).toBeNull();
  });

  it('reads avatarUrl from providerData', () => {
    expect(
      oauthPictureUrlFromProviderData({
        avatarUrl: 'https://avatars.githubusercontent.com/u/1?v=4',
      })
    ).toBe('https://avatars.githubusercontent.com/u/1?v=4');
  });

  it('treats blank user pictures as empty', () => {
    expect(userPictureUrlIsEmpty(null)).toBe(true);
    expect(userPictureUrlIsEmpty('  ')).toBe(true);
    expect(userPictureUrlIsEmpty('https://cdn.example.com/me.png')).toBe(false);
  });
});
