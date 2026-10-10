import { Command } from 'commander';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/authenticated.js', () => ({
  authenticatedRequest: vi.fn(),
}));

const { authenticatedRequest } = await import('../api/authenticated.js');
const { createApiCommand } = await import('./api.js');

const run = (...argv: string[]) => {
  const program = new Command();
  program.exitOverride();
  createApiCommand(program);
  return program.parseAsync(['node', 'grant', ...argv]);
};

describe('grant api', () => {
  let logs: string[];

  beforeEach(() => {
    logs = [];
    vi.mocked(authenticatedRequest).mockReset();
    vi.mocked(authenticatedRequest).mockResolvedValue({ status: 200, data: { ok: true } });
    vi.spyOn(console, 'log').mockImplementation((...a) => void logs.push(a.join(' ')));
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('calls GET /api/users with injected scope by default', async () => {
    await run('api', 'get', '/api/users', '--output', 'json');
    expect(authenticatedRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'get',
        path: '/api/users',
        injectScope: true,
      })
    );
    expect(logs[0]).toContain('"ok": true');
  });

  it('parses query pairs and JSON body', async () => {
    await run(
      'api',
      'post',
      '/api/roles',
      '--query',
      'limit=10',
      '--body',
      '{"name":"Reviewer"}',
      '--output',
      'json'
    );
    expect(authenticatedRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'post',
        path: '/api/roles',
        query: { limit: '10' },
        body: { name: 'Reviewer' },
      })
    );
  });
});
