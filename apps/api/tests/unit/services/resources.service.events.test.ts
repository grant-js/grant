import type { IAuditLogger, IEventPublisher, IResourceRepository } from '@grantjs/core';
import type { Resource } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { ResourceService } from '@/services/resources.service';

const resourceId = '10000000-0000-4000-8000-000000000001';
const projectA = '10000000-0000-4000-8000-00000000000a';
const projectB = '10000000-0000-4000-8000-00000000000b';

function resource(): Resource {
  return {
    id: resourceId,
    name: 'Documents',
    slug: 'documents',
    description: null,
    actions: ['read'],
    metadata: {},
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
  } as Resource;
}

function buildService(resolved: string[] = []) {
  const resourceRepository = {
    getResources: vi.fn().mockResolvedValue({
      resources: [resource()],
      totalCount: 1,
      hasNextPage: false,
    }),
    softDeleteResource: vi.fn().mockResolvedValue(resource()),
    hardDeleteResource: vi.fn().mockResolvedValue(resource()),
  } as unknown as IResourceRepository;
  const audit = {
    logSoftDelete: vi.fn(),
    logHardDelete: vi.fn(),
  } as unknown as IAuditLogger;
  const events = {
    publish: vi.fn(),
    resolveLinkedProjectIds: vi.fn().mockResolvedValue(resolved),
  } as unknown as IEventPublisher;
  return { service: new ResourceService(resourceRepository, audit, events), events };
}

describe('ResourceService.deleteResource project links', () => {
  it('publishes resource.deleted with the projects a caller read before it unlinked them', async () => {
    // Nothing is linked any more when the service reads: the caller already removed the rows.
    const { service, events } = buildService([]);

    await service.deleteResource({ id: resourceId, linkedProjectIds: [projectA, projectB] });

    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'resource.deleted',
        aggregate: { kind: 'resource', id: resourceId },
        projectIds: [projectA, projectB],
      }),
      undefined
    );
  });

  it('merges the caller hint with the links still present, without duplicates', async () => {
    const { service, events } = buildService([projectB]);

    await service.deleteResource({ id: resourceId, linkedProjectIds: [projectA, projectB] });

    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'resource.deleted', projectIds: [projectA, projectB] }),
      undefined
    );
  });
});
