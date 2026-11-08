import { ApolloServer, type ApolloServerPlugin, HeaderMap } from '@apollo/server';
import { afterEach, describe, expect, it } from 'vitest';

import { createGraphqlLandingPagePlugin } from '@/lib/graphql/landing-page.lib';

const typeDefs = 'type Query { ok: Boolean }';

let server: ApolloServer | undefined;

afterEach(async () => {
  await server?.stop();
  server = undefined;
});

/** What a browser gets on `GET /graphql`: its status and, for a page, the HTML. */
async function browserGet(plugins: ApolloServerPlugin[]) {
  server = new ApolloServer({ typeDefs, plugins });
  await server.start();

  const response = await server.executeHTTPGraphQLRequest({
    httpGraphQLRequest: {
      method: 'GET',
      headers: new HeaderMap([['accept', 'text/html']]),
      search: '',
      body: undefined,
    },
    context: async () => ({}),
  });

  const body = response.body.kind === 'complete' ? response.body.string : '';
  return { status: response.status ?? 200, body };
}

describe('createGraphqlLandingPagePlugin', () => {
  it('serves the embedded Apollo Sandbox when APOLLO_PLAYGROUND is on', async () => {
    const { status, body } = await browserGet([createGraphqlLandingPagePlugin(true)]);

    expect(status).toBe(200);
    expect(body).toContain('embeddable-sandbox');
  });

  it('serves no landing page when APOLLO_PLAYGROUND is off', async () => {
    const { status, body } = await browserGet([createGraphqlLandingPagePlugin(false)]);

    expect(status).toBe(400);
    expect(body).not.toContain('<html');
  });

  it('needs the explicit plugin: without one, Apollo falls back to its own Sandbox page', async () => {
    // Why "off" cannot just leave the plugin out. Outside NODE_ENV=production, Apollo
    // Server installs its default landing page, the embedded Sandbox, which is what
    // `/graphql` kept serving while the web app hid the link to it.
    expect(process.env.NODE_ENV).not.toBe('production');

    const { body } = await browserGet([]);

    expect(body).toContain('embeddable-sandbox');
  });
});
