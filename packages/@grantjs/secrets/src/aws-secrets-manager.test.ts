import { ConfigurationError, type ILogger } from '@grantjs/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const send = vi.fn();

vi.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: class {
    send = send;
  },
  GetSecretValueCommand: class {
    constructor(public readonly input: { SecretId: string }) {}
  },
}));

const { AwsSecretsManagerResolver } = await import('./aws-secrets-manager');

const logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
} as unknown as ILogger;

const make = (cacheTtlSeconds = 300) =>
  new AwsSecretsManagerResolver(
    { secretId: 'grant/secrets', region: 'us-east-1', cacheTtlSeconds },
    logger
  );

describe('AwsSecretsManagerResolver', () => {
  beforeEach(() => {
    send.mockReset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.GRANT_TEST_FALLBACK;
    vi.useRealTimers();
  });

  it('requires a secret id', () => {
    expect(
      () =>
        new AwsSecretsManagerResolver(
          { secretId: '', region: 'us-east-1', cacheTtlSeconds: 1 },
          logger
        )
    ).toThrow(ConfigurationError);
  });

  it('resolves a key from the JSON payload', async () => {
    send.mockResolvedValue({ SecretString: JSON.stringify({ GITHUB_CLIENT_SECRET: 'gh' }) });
    await expect(make().resolve('GITHUB_CLIENT_SECRET')).resolves.toBe('gh');
  });

  it('falls back to process.env for keys the payload omits', async () => {
    // This is what makes adoption incremental: enabling the provider with a
    // partial payload leaves every other key resolving exactly as before.
    send.mockResolvedValue({ SecretString: JSON.stringify({ GITHUB_CLIENT_SECRET: 'gh' }) });
    process.env.GRANT_TEST_FALLBACK = 'from-env';
    await expect(make().resolve('GRANT_TEST_FALLBACK')).resolves.toBe('from-env');
  });

  it('returns undefined when a key is in neither the payload nor the environment', async () => {
    send.mockResolvedValue({ SecretString: JSON.stringify({}) });
    await expect(make().resolve('GRANT_TEST_FALLBACK')).resolves.toBeUndefined();
  });

  it('fetches once and serves later resolves from cache', async () => {
    send.mockResolvedValue({ SecretString: JSON.stringify({ A: '1', B: '2' }) });
    const resolver = make();
    await resolver.resolve('A');
    await resolver.resolve('B');
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('shares one in-flight fetch across concurrent resolves', async () => {
    // Cold-start stampede: several requests can hit an empty cache at once.
    let release: (v: unknown) => void = () => {};
    send.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    const resolver = make();
    const pending = Promise.all([
      resolver.resolve('A'),
      resolver.resolve('A'),
      resolver.resolve('A'),
    ]);
    release({ SecretString: JSON.stringify({ A: '1' }) });
    await expect(pending).resolves.toEqual(['1', '1', '1']);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('refetches after the TTL expires, which is how rotation is picked up', async () => {
    vi.useFakeTimers();
    send.mockResolvedValue({ SecretString: JSON.stringify({ A: 'old' }) });
    const resolver = make(60);
    await expect(resolver.resolve('A')).resolves.toBe('old');

    send.mockResolvedValue({ SecretString: JSON.stringify({ A: 'rotated' }) });
    vi.advanceTimersByTime(61_000);
    await expect(resolver.resolve('A')).resolves.toBe('rotated');
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('rejects a non-JSON payload without echoing its contents', async () => {
    send.mockResolvedValue({ SecretString: 'super-secret-not-json' });
    await expect(make().resolve('A')).rejects.toThrow(ConfigurationError);
    await expect(make().resolve('A')).rejects.not.toThrow(/super-secret-not-json/);
  });

  it('rejects a JSON array', async () => {
    send.mockResolvedValue({ SecretString: '["a"]' });
    await expect(make().resolve('A')).rejects.toThrow(ConfigurationError);
  });

  it('rejects a binary-only secret', async () => {
    send.mockResolvedValue({ SecretBinary: new Uint8Array([1, 2]) });
    await expect(make().resolve('A')).rejects.toThrow(ConfigurationError);
  });

  it('logs key names but never values', async () => {
    send.mockResolvedValue({ SecretString: JSON.stringify({ GITHUB_CLIENT_SECRET: 'gh-secret' }) });
    await make().resolve('GITHUB_CLIENT_SECRET');
    const logged = JSON.stringify((logger.info as ReturnType<typeof vi.fn>).mock.calls);
    expect(logged).toContain('GITHUB_CLIENT_SECRET');
    expect(logged).not.toContain('gh-secret');
  });
});
