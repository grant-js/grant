import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/config', () => ({
  config: {
    demoMode: { enabled: false, dbRefreshSchedule: '0 0 */2 * *' },
    privacy: { accountDeletionRetentionDays: 30 },
    app: { version: '1.2.3' },
    storage: { cdmImport: { maxBytes: 33554432 } },
  },
}));

import { createConfigRoutes } from '@/rest/routes/config.routes';

describe('GET /api/config', () => {
  const app = express();
  app.use('/api/config', createConfigRoutes());

  it('tells the web app the largest CDM import it can upload by reference (ADR 0009)', async () => {
    const response = await request(app).get('/api/config');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      demoModeEnabled: false,
      demoModeDbRefreshSchedule: '0 0 */2 * *',
      accountDeletionRetentionDays: '30',
      appVersion: '1.2.3',
      cdmUploadMaxBytes: 33554432,
    });
  });
});
