import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:fs', () => ({ existsSync: vi.fn(() => true) }));
vi.mock('../config/index.js', () => ({
  getConfigPath: vi.fn(() => '/tmp/grant/config.json'),
  listProfileNames: vi.fn(() => ['default', 'staging']),
  loadConfigFile: vi.fn(),
  loadProfile: vi.fn(),
  saveConfigFile: vi.fn(async () => {}),
}));

const storage = await import('../config/index.js');
const { createConfigCommand } = await import('./config-cmd.js');

/**
 * Pass 7, slice 8. config-cmd.ts is 304 lines — the largest untested file in the trio —
 * and it had no tests.
 *
 * Driven through Commander rather than by reaching for its module-private helpers,
 * because `@grantjs/cli` has no module API at all: its exports map declares only ".",
 * whose built d.ts is `export {}`. Its contract IS the command surface and the config
 * file it writes, so that is the level the tests work at.
 */

const profile = (over: Record<string, unknown> = {}) => ({
  file: { defaultProfile: 'default', profiles: { default: { apiUrl: 'https://a.test' } } },
  config: { apiUrl: 'https://a.test', authMethod: 'session', ...over },
  profileName: 'default',
});

let logs: string[];
let errors: string[];
let exitCode: number | undefined;

const run = (...argv: string[]) => {
  const program = new Command();
  program.exitOverride();
  createConfigCommand(program);
  return program.parseAsync(['node', 'grant', 'config', ...argv]);
};

beforeEach(() => {
  vi.clearAllMocks();
  logs = [];
  errors = [];
  exitCode = undefined;
  vi.spyOn(console, 'log').mockImplementation((...a) => void logs.push(a.join(' ')));
  vi.spyOn(console, 'error').mockImplementation((...a) => void errors.push(a.join(' ')));
  vi.spyOn(process, 'exit').mockImplementation(((c?: number) => {
    exitCode = c;
    throw new Error('process.exit');
  }) as never);
  vi.mocked(storage.getConfigPath).mockReturnValue('/tmp/grant/config.json');
  vi.mocked(storage.listProfileNames).mockReturnValue(['default', 'staging']);
});

afterEach(() => vi.restoreAllMocks());

describe('grant config path', () => {
  it('prints the config path', async () => {
    await run('path');
    expect(logs).toEqual(['/tmp/grant/config.json']);
  });
});

describe('grant config list', () => {
  it('marks the default profile', async () => {
    vi.mocked(storage.loadConfigFile).mockResolvedValue({
      defaultProfile: 'staging',
      profiles: { default: {}, staging: {} },
    } as never);
    await run('list');
    expect(logs.join('\n')).toContain('Default profile: staging');
    expect(logs).toContain('  - staging (default)');
    expect(logs).toContain('  - default');
  });

  it('tells the user how to bootstrap when there are no profiles', async () => {
    vi.mocked(storage.loadConfigFile).mockResolvedValue(null as never);
    await run('list');
    expect(logs.join('\n')).toContain('No profiles. Run "grant start" to create one.');
  });
});

describe('grant config show', () => {
  it('prints a summary and never a secret', async () => {
    vi.mocked(storage.loadProfile).mockResolvedValue(
      profile({
        authMethod: 'api-key',
        apiKey: { clientId: 'id', clientSecret: 'SUPER_SECRET_VALUE' },
        selectedScope: { tenant: 'accountProject', id: 'a:b' },
      }) as never
    );
    await run('show');
    const out = logs.join('\n');
    expect(out).toContain('Profile: default');
    expect(out).toContain('Auth method: api-key');
    expect(out).toContain('Selected scope: accountProject:a:b');
    // The command's stated contract is "no secrets".
    expect(out).not.toContain('SUPER_SECRET_VALUE');
  });

  it('does not fail when there is no profile', async () => {
    vi.mocked(storage.loadProfile).mockResolvedValue(null as never);
    await run('show');
    expect(logs.join('\n')).toContain('No config or profile not found');
    expect(exitCode).toBeUndefined();
  });
});

describe('grant config set api-url', () => {
  beforeEach(() => vi.mocked(storage.loadProfile).mockResolvedValue(profile() as never));

  it('saves a valid URL', async () => {
    await run('set', 'api-url', 'https://grant.example.com');
    expect(storage.saveConfigFile).toHaveBeenCalledOnce();
    const saved = vi.mocked(storage.saveConfigFile).mock.calls[0][0];
    expect(saved.profiles.default.apiUrl).toBe('https://grant.example.com');
  });

  it('strips trailing slashes before saving', async () => {
    await run('set', 'api-url', 'https://grant.example.com///');
    const saved = vi.mocked(storage.saveConfigFile).mock.calls[0][0];
    expect(saved.profiles.default.apiUrl).toBe('https://grant.example.com');
  });

  it.each(['not-a-url', 'ftp://grant.example.com', 'file:///etc/passwd'])(
    'rejects %o and does not save',
    async (url) => {
      await expect(run('set', 'api-url', url)).rejects.toThrow('process.exit');
      expect(exitCode).toBe(1);
      expect(storage.saveConfigFile).not.toHaveBeenCalled();
    }
  );

  it('accepts http for local development', async () => {
    await run('set', 'api-url', 'http://localhost:4000');
    const saved = vi.mocked(storage.saveConfigFile).mock.calls[0][0];
    expect(saved.profiles.default.apiUrl).toBe('http://localhost:4000');
  });
});

describe('grant config set auth-method', () => {
  beforeEach(() =>
    vi.mocked(storage.loadProfile).mockResolvedValue(
      profile({
        session: { accessToken: 'a' },
        apiKey: { clientId: 'i', clientSecret: 's' },
      }) as never
    )
  );

  it('switching to session drops the api-key credentials', async () => {
    await run('set', 'auth-method', 'session');
    const saved = vi.mocked(storage.saveConfigFile).mock.calls[0][0];
    expect(saved.profiles.default.authMethod).toBe('session');
    expect(saved.profiles.default.apiKey).toBeUndefined();
    expect(saved.profiles.default.session).toBeDefined();
  });

  it('switching to api-key drops the session', async () => {
    await run('set', 'auth-method', 'api-key');
    const saved = vi.mocked(storage.saveConfigFile).mock.calls[0][0];
    expect(saved.profiles.default.authMethod).toBe('api-key');
    expect(saved.profiles.default.session).toBeUndefined();
    expect(saved.profiles.default.apiKey).toBeDefined();
  });

  it('is case-insensitive', async () => {
    await run('set', 'auth-method', 'SESSION');
    expect(vi.mocked(storage.saveConfigFile).mock.calls[0][0].profiles.default.authMethod).toBe(
      'session'
    );
  });

  it('rejects anything else', async () => {
    await expect(run('set', 'auth-method', 'oauth')).rejects.toThrow('process.exit');
    expect(exitCode).toBe(1);
    expect(storage.saveConfigFile).not.toHaveBeenCalled();
  });
});

describe('requireProfile', () => {
  it('exits 1 with a bootstrap hint when no profile exists', async () => {
    vi.mocked(storage.loadProfile).mockResolvedValue(null as never);
    await expect(run('set', 'api-url', 'https://a.test')).rejects.toThrow('process.exit');
    expect(exitCode).toBe(1);
    expect(errors.join('\n')).toContain('Run "grant start" first.');
  });
});
