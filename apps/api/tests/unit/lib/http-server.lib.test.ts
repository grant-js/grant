import http from 'http';
import { afterEach, describe, expect, it } from 'vitest';

import { closeHttpServer } from '@/lib/http-server.lib';

const servers: http.Server[] = [];

function listeningServer(): Promise<http.Server> {
  const server = http.createServer();
  servers.push(server);
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

afterEach(() => {
  for (const server of servers.splice(0)) {
    if (server.listening) server.close();
  }
});

describe('closeHttpServer', () => {
  it('closes a listening server', async () => {
    const server = await listeningServer();

    await expect(closeHttpServer(server)).resolves.toBeUndefined();
    expect(server.listening).toBe(false);
  });

  it('resolves when the server is already closed', async () => {
    // The regression. ApolloServerPluginDrainHttpServer closes the server during
    // apolloServer.stop(), so graceful shutdown always reaches this state. Before
    // the fix, close() reported ERR_SERVER_NOT_RUNNING, the shutdown promise
    // rejected, and every step after it — tracing flush, job shutdown, cache
    // disconnect, database close — was skipped on the way to exit(1).
    const server = await listeningServer();
    await closeHttpServer(server);

    await expect(closeHttpServer(server)).resolves.toBeUndefined();
  });

  it('resolves for a server that never listened', async () => {
    const server = http.createServer();

    await expect(closeHttpServer(server)).resolves.toBeUndefined();
  });

  it('propagates errors that are not ERR_SERVER_NOT_RUNNING', async () => {
    const failure = Object.assign(new Error('socket teardown failed'), { code: 'EADDRINUSE' });
    const server = {
      close: (cb: (err?: Error) => void) => cb(failure),
    } as unknown as http.Server;

    await expect(closeHttpServer(server)).rejects.toThrow('socket teardown failed');
  });
});
