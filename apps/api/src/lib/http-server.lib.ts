import type http from 'http';

/**
 * Close an HTTP server, treating an already-closed server as success.
 *
 * `ApolloServerPluginDrainHttpServer` closes the HTTP server as part of
 * `apolloServer.stop()`. Graceful shutdown stops Apollo first and then closes the
 * server itself, so by the time it does, Node has already torn the listener down and
 * `close()` reports `ERR_SERVER_NOT_RUNNING`.
 *
 * That is not a failure — the desired end state is exactly what happened. But the
 * raw callback surfaces it as an error, and a shutdown sequence that rejects there
 * abandons every step after it. Absorbing this one code, and only this one, keeps
 * the call correct whether or not a drain plugin got there first.
 */
export async function closeHttpServer(server: http.Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => {
      if (err && (err as NodeJS.ErrnoException).code !== 'ERR_SERVER_NOT_RUNNING') {
        reject(err);
        return;
      }
      resolve();
    });
  });
}
