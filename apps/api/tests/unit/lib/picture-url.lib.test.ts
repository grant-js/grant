import { describe, expect, it, vi } from 'vitest';

import {
  DERIVED_PICTURE_URL_MAX_LENGTH,
  effectivePictureUrl,
  hydratePictureUrl,
  hydratePictureUrls,
  picturePathWhenSettingUrl,
} from '@/lib/picture-url.lib';

function storage(url = 'https://signed.example/object?sig=1') {
  return { getUrl: vi.fn().mockResolvedValue(url) };
}

describe('effectivePictureUrl', () => {
  it('derives from picturePath when present', async () => {
    const fileStorage = storage('https://signed.example/from-path');
    await expect(
      effectivePictureUrl(fileStorage, {
        picturePath: 'users/1/picture.jpg',
        pictureUrl: 'https://idp.example/avatar.png',
      })
    ).resolves.toBe('https://signed.example/from-path');
    expect(fileStorage.getUrl).toHaveBeenCalledWith('users/1/picture.jpg');
  });

  it('falls back to pictureUrl when picturePath is null', async () => {
    const fileStorage = storage();
    await expect(
      effectivePictureUrl(fileStorage, {
        picturePath: null,
        pictureUrl: 'https://idp.example/avatar.png',
      })
    ).resolves.toBe('https://idp.example/avatar.png');
    expect(fileStorage.getUrl).not.toHaveBeenCalled();
  });

  it('returns null when both are empty', async () => {
    await expect(effectivePictureUrl(storage(), { picturePath: null, pictureUrl: null })).resolves.toBe(
      null
    );
  });

  it('does not depend on presign expiry', async () => {
    const longUrl = `https://s3.example/${'x'.repeat(1200)}`;
    expect(longUrl.length).toBeGreaterThan(500);
    expect(longUrl.length).toBeLessThanOrEqual(DERIVED_PICTURE_URL_MAX_LENGTH);
    await expect(
      effectivePictureUrl(storage(longUrl), { picturePath: 'users/1/picture.jpg' })
    ).resolves.toBe(longUrl);
  });
});

describe('hydratePictureUrl', () => {
  it('writes the derived URL and strips picturePath', async () => {
    const row = { id: 'u1', picturePath: 'users/1/picture.jpg', pictureUrl: null as string | null };
    await hydratePictureUrl(storage('https://signed.example/u1'), row);
    expect(row.pictureUrl).toBe('https://signed.example/u1');
    expect(row.picturePath).toBeUndefined();
  });

  it('hydrates a list', async () => {
    const fileStorage = storage('https://signed.example/list');
    const rows = [
      { picturePath: 'a.jpg', pictureUrl: null as string | null },
      { picturePath: null, pictureUrl: 'https://idp.example/b.png' },
    ];
    await hydratePictureUrls(fileStorage, rows);
    expect(rows[0].pictureUrl).toBe('https://signed.example/list');
    expect(rows[1].pictureUrl).toBe('https://idp.example/b.png');
    expect(fileStorage.getUrl).toHaveBeenCalledTimes(1);
  });
});

describe('picturePathWhenSettingUrl', () => {
  it('clears picturePath when a client sets pictureUrl alone', () => {
    expect(picturePathWhenSettingUrl({ pictureUrl: 'https://example.com/p.png' })).toEqual({
      pictureUrl: 'https://example.com/p.png',
      picturePath: null,
    });
  });

  it('leaves an explicit picturePath in place', () => {
    expect(
      picturePathWhenSettingUrl({
        pictureUrl: 'https://example.com/p.png',
        picturePath: 'users/1/picture.jpg',
      })
    ).toEqual({
      pictureUrl: 'https://example.com/p.png',
      picturePath: 'users/1/picture.jpg',
    });
  });

  it('does not invent a path when only picturePath is set', () => {
    expect(picturePathWhenSettingUrl({ picturePath: 'users/1/picture.jpg' })).toEqual({
      picturePath: 'users/1/picture.jpg',
    });
  });
});
