import { Command } from 'commander';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/authenticated.js', () => ({
  authenticatedRequest: vi.fn(),
}));
vi.mock('../config/credentials.js', () => ({
  resolveRuntimeContext: vi.fn(),
}));

const { authenticatedRequest } = await import('../api/authenticated.js');
const { resolveRuntimeContext } = await import('../config/credentials.js');
const { createWhoamiCommand } = await import('./whoami.js');

const run = (...argv: string[]) => {
  const program = new Command();
  program.exitOverride();
  createWhoamiCommand(program);
  return program.parseAsync(['node', 'grant', ...argv]);
};

describe('grant whoami', () => {
  let logs: string[];

  beforeEach(() => {
    logs = [];
    vi.mocked(authenticatedRequest).mockReset();
    vi.mocked(resolveRuntimeContext).mockReset();
    vi.mocked(resolveRuntimeContext).mockResolvedValue({
      apiUrl: 'http://localhost:4000',
      authMethod: 'api-key',
      config: { apiUrl: 'http://localhost:4000', authMethod: 'api-key' },
      profileName: 'ci',
      scope: { tenant: 'organizationProject', id: 'o:p' },
    });
    vi.mocked(authenticatedRequest).mockResolvedValue({
      status: 200,
      data: { email: 'op@example.com' },
    });
    vi.spyOn(console, 'log').mockImplementation((...a) => void logs.push(a.join(' ')));
  });

  it('prints caller identity as JSON', async () => {
    await run('whoami', '--output', 'json');
    expect(authenticatedRequest).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET', path: '/api/me', injectScope: false })
    );
    expect(logs.join('\n')).toContain('op@example.com');
    expect(logs.join('\n')).toContain('"profile": "ci"');
  });
});
