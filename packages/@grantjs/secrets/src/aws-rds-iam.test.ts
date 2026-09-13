/**
 * The token signer, and the two properties that make it usable as a pooled password.
 *
 * `@aws-sdk/rds-signer` is mocked: signing is a local SigV4 computation and asserting its
 * output would be asserting the SDK. What matters here is that a *fresh* token is produced
 * per call and that the token never reaches a log.
 */
import { ConfigurationError } from '@grantjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAuthToken = vi.fn(async () => 'token-1');
// A normal function, not an arrow: the adapter calls `new sdk.Signer(...)`, and an arrow
// cannot be constructed. Returning an object from a constructor replaces `this`, so `new`
// yields exactly this shape while `SignerCtor.mock.calls` still records the config.
const SignerCtor = vi.fn(function SignerMock() {
  return { getAuthToken };
});

vi.mock('@aws-sdk/rds-signer', () => ({ Signer: SignerCtor }));

const { AwsRdsIamTokenSigner } = await import('./aws-rds-iam');

const CONFIG = {
  hostname: 'db.cluster-abc.eu-central-1.rds.amazonaws.com',
  port: 5432,
  username: 'grant_app',
  region: 'eu-central-1',
};

function fakeLogger() {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getAuthToken.mockResolvedValue('token-1');
});

describe('signing', () => {
  it('signs for the endpoint and user it was given', async () => {
    // The endpoint is part of the signature: a token signed for the cluster endpoint is
    // refused by the proxy and vice versa. Getting this wrong presents as a password
    // failure, which is why it is asserted rather than assumed.
    const signer = new AwsRdsIamTokenSigner(CONFIG);

    await signer.getToken();

    expect(SignerCtor).toHaveBeenCalledWith(CONFIG);
  });

  it('returns a fresh token per call, because a pool authenticates per connection', async () => {
    // The property the whole option rests on. A cached token would be handed to a
    // connection opened just before its expiry, which is the failure this design avoids.
    getAuthToken.mockResolvedValueOnce('token-1').mockResolvedValueOnce('token-2');
    const signer = new AwsRdsIamTokenSigner(CONFIG);

    await expect(signer.getToken()).resolves.toBe('token-1');
    await expect(signer.getToken()).resolves.toBe('token-2');
    expect(getAuthToken).toHaveBeenCalledTimes(2);
  });

  it('is usable directly as `DatabaseConfig.password`', async () => {
    // `getToken` is a bound property rather than a method so it survives being detached.
    // Passed as `password: signer.getToken`, an unbound method would lose `this` and throw
    // on the first connection — at which point the deployment cannot reach its database.
    const signer = new AwsRdsIamTokenSigner(CONFIG);
    const password: () => Promise<string> = signer.getToken;

    await expect(password()).resolves.toBe('token-1');
  });

  it('keeps the token out of the log', async () => {
    // It is a bearer credential for the database. A debug line is the last place it should
    // appear, and "we logged the length" is the assertion that says so.
    const logger = fakeLogger();
    const signer = new AwsRdsIamTokenSigner(CONFIG, logger as never);

    await signer.getToken();

    const logged = JSON.stringify(logger.debug.mock.calls);
    expect(logged).not.toContain('token-1');
    expect(logged).toContain('length');
  });
});

describe('refusals', () => {
  it('refuses without a hostname, rather than signing for nothing', async () => {
    expect(() => new AwsRdsIamTokenSigner({ ...CONFIG, hostname: '' })).toThrow(ConfigurationError);
  });

  it('refuses without a username', async () => {
    expect(() => new AwsRdsIamTokenSigner({ ...CONFIG, username: '' })).toThrow(ConfigurationError);
  });
});
