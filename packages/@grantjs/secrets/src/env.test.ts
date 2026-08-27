import { afterEach, describe, expect, it } from 'vitest';

import { EnvSecretResolver } from './env';

const KEY = 'GRANT_TEST_SECRET_KEY';

describe('EnvSecretResolver', () => {
  afterEach(() => {
    delete process.env[KEY];
  });

  it('returns the value from process.env', async () => {
    process.env[KEY] = 'value';
    await expect(new EnvSecretResolver().resolve(KEY)).resolves.toBe('value');
  });

  it('returns undefined when unset', async () => {
    await expect(new EnvSecretResolver().resolve(KEY)).resolves.toBeUndefined();
  });

  it('treats empty string as not configured', async () => {
    // The env schema defaults every secret key to '', and both call sites test
    // truthiness. Normalizing keeps `undefined` meaning "not configured".
    process.env[KEY] = '';
    await expect(new EnvSecretResolver().resolve(KEY)).resolves.toBeUndefined();
  });

  it('reads the current value on each call rather than caching at construction', async () => {
    const resolver = new EnvSecretResolver();
    process.env[KEY] = 'first';
    await expect(resolver.resolve(KEY)).resolves.toBe('first');
    process.env[KEY] = 'second';
    await expect(resolver.resolve(KEY)).resolves.toBe('second');
  });
});
