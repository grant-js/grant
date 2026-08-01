import type { IAuditLogger, IEventPublisher, ISigningKeyRepository } from '@grantjs/core';
import { Tenant } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SigningKeyService } from '@/services/signing-keys.service';

const keyId = '10000000-0000-4000-8000-000000000070';
const scope = { tenant: Tenant.System, id: 'system' };

function buildService() {
  const current = {
    id: '10000000-0000-4000-8000-000000000071',
    kid: 'sys-old',
    active: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    rotatedAt: null,
  };

  const created = {
    id: keyId,
    kid: 'sys-new',
    active: true,
    createdAt: new Date('2026-01-02T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    deletedAt: null,
    rotatedAt: null,
  };

  const signingKeyRepository = {
    getByScope: vi.fn().mockResolvedValue(current),
    createSigningKey: vi.fn().mockResolvedValue(created),
    updateSigningKey: vi.fn().mockResolvedValue(undefined),
    listByScope: vi.fn().mockResolvedValue([created]),
  } as unknown as ISigningKeyRepository;

  const audit = {
    logCreate: vi.fn(),
    logUpdate: vi.fn(),
    logAction: vi.fn(),
    logSoftDelete: vi.fn(),
    logHardDelete: vi.fn(),
  } as unknown as IAuditLogger;

  const events = {
    publish: vi.fn(),
  } as unknown as IEventPublisher;

  return {
    service: new SigningKeyService(signingKeyRepository, audit, events),
    events,
  };
}

describe('SigningKeyService security events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('publishes signing_key.rotated after rotateForScope', async () => {
    const { service, events } = buildService();

    await service.rotateForScope(scope);

    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'signing_key.rotated',
        scope,
        aggregate: { kind: 'signingKey', id: keyId },
        data: expect.objectContaining({
          after: expect.objectContaining({ kid: 'sys-new', previousKid: 'sys-old' }),
        }),
      }),
      undefined
    );
  });
});
