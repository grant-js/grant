import { Script } from 'node:vm';

import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createSwaggerUiHandlers } from '@/rest/openapi/swagger-ui';

function createApp() {
  const app = express();
  app.use(
    '/api-docs',
    ...createSwaggerUiHandlers({
      customSiteTitle: 'Grant API Docs',
      swaggerOptions: { deepLinking: true, docExpansion: 'list' },
    })
  );
  return app;
}

async function fetchInitScript(): Promise<string> {
  const response = await request(createApp()).get('/api-docs/swagger-ui-init.js').expect(200);
  return response.text;
}

describe('Swagger UI at /api-docs', () => {
  it('serves an init script that parses', async () => {
    // The regression: swagger-ui-express used to paste the document into this script
    // with String.prototype.replace, and the "$`" in the CDM bcrypt hash description
    // cut the script off mid-string. The browser threw a SyntaxError and showed a
    // blank page.
    const script = await fetchInitScript();

    expect(() => new Script(script)).not.toThrow();
  });

  it('points the page at /api-docs.json instead of inlining the document', async () => {
    const script = await fetchInitScript();

    expect(script).toContain('"swaggerUrl": "../api-docs.json"');
    expect(script).not.toContain('"swaggerDoc"');
    expect(script).not.toContain('"paths"');
  });

  it('passes the configured Swagger UI options through', async () => {
    const script = await fetchInitScript();

    expect(script).toMatch(/"deepLinking": true/);
    expect(script).toMatch(/"docExpansion": "list"/);
  });

  it('serves the page with its configured title', async () => {
    const response = await request(createApp()).get('/api-docs/').expect(200);

    expect(response.text).toContain('<title>Grant API Docs</title>');
  });
});
