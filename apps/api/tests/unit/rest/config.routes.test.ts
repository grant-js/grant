import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockConfig = vi.hoisted(() => ({
  demoMode: { enabled: false, dbRefreshSchedule: '0 0 */2 * *' },
  privacy: { accountDeletionRetentionDays: 30 },
  app: { version: '1.2.3', docsUrl: undefined as string | undefined },
  storage: { cdmImport: { maxBytes: 33554432 } },
  swagger: { enabled: true },
  apollo: { playground: true },
}));

vi.mock('@/config', () => ({ config: mockConfig }));

import { createConfigRoutes } from '@/rest/routes/config.routes';

describe('GET /api/config', () => {
  const app = express();
  app.use('/api/config', createConfigRoutes());

  beforeEach(() => {
    mockConfig.app.docsUrl = undefined;
    mockConfig.swagger.enabled = true;
    mockConfig.apollo.playground = true;
  });

  it('tells the web app the largest CDM import it can upload by reference (ADR 0009)', async () => {
    const response = await request(app).get('/api/config');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      demoModeEnabled: false,
      demoModeDbRefreshSchedule: '0 0 */2 * *',
      accountDeletionRetentionDays: '30',
      appVersion: '1.2.3',
      cdmUploadMaxBytes: 33554432,
      docsUrl: null,
      apiReferenceEnabled: true,
      graphqlPlaygroundEnabled: true,
    });
  });

  it('returns DOCS_URL as docsUrl when it is set', async () => {
    mockConfig.app.docsUrl = 'https://demo.grantjs.org/docs/';

    const response = await request(app).get('/api/config');

    expect(response.body.docsUrl).toBe('https://demo.grantjs.org/docs/');
  });

  it('reports a disabled Swagger UI and Apollo Sandbox so the web hides their links', async () => {
    mockConfig.swagger.enabled = false;
    mockConfig.apollo.playground = false;

    const response = await request(app).get('/api/config');

    expect(response.body.apiReferenceEnabled).toBe(false);
    expect(response.body.graphqlPlaygroundEnabled).toBe(false);
  });

  it('reports each surface on its own', async () => {
    mockConfig.swagger.enabled = false;

    const response = await request(app).get('/api/config');

    expect(response.body.apiReferenceEnabled).toBe(false);
    expect(response.body.graphqlPlaygroundEnabled).toBe(true);
  });
});
