import { describe, expect, it } from 'vitest';

import { isStoragePath, proxiesStorageToApi } from '@/lib/storage-proxy';

describe('proxiesStorageToApi', () => {
  it.each([{}, { STORAGE_PROVIDER: '' }, { STORAGE_PROVIDER: ' LOCAL ' }])(
    'keeps proxying for the local provider or an unset one: %j',
    (env) => {
      expect(proxiesStorageToApi(env)).toBe(true);
    }
  );

  it.each(['s3', 'S3', ' s3 '])('stops proxying for the %s provider', (provider) => {
    expect(proxiesStorageToApi({ STORAGE_PROVIDER: provider })).toBe(false);
  });
});

describe('isStoragePath', () => {
  it.each([
    '/storage',
    '/storage/',
    '/storage/imports/projects/x/y.json',
    '/storage/users/1/a.png',
  ])('matches %s', (pathname) => {
    expect(isStoragePath(pathname)).toBe(true);
  });

  it.each(['/storages', '/storage-x/y', '/en/storage', '/api/storage'])(
    'does not match %s',
    (pathname) => {
      expect(isStoragePath(pathname)).toBe(false);
    }
  );
});
