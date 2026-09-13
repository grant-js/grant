import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OrganizationService } from '@/services/organizations.service';

const organizationId = '11111111-1111-4111-8111-111111111111';
const now = new Date('2026-09-11T12:00:00.000Z');

function org(pictureUrl: string | null) {
  return {
    id: organizationId,
    name: 'Acme',
    slug: 'acme',
    requireMfaForSensitiveActions: false,
    pictureUrl,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

describe('OrganizationService.setOrganizationPictureUrl', () => {
  const audit = {
    logUpdate: vi.fn(),
    logCreate: vi.fn(),
    logSoftDelete: vi.fn(),
    logHardDelete: vi.fn(),
  };
  const organizationRepository = {
    getOrganizations: vi.fn(),
    setOrganizationPictureUrl: vi.fn(),
  };
  const organizationUserRepository = {
    getUserOrganizationMemberships: vi.fn(),
  };

  function svc() {
    return new OrganizationService(
      organizationRepository as never,
      organizationUserRepository as never,
      { userId: 'u1' } as never,
      audit as never,
      { publish: vi.fn() } as never
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    organizationRepository.getOrganizations.mockResolvedValue({
      organizations: [org(null)],
      totalCount: 1,
      hasNextPage: false,
    });
    organizationRepository.setOrganizationPictureUrl.mockResolvedValue(
      org('/storage/organizations/org/picture.jpg')
    );
  });

  it('updates pictureUrl and writes an audit log', async () => {
    const service = svc();
    const updated = await service.setOrganizationPictureUrl(
      organizationId,
      '/storage/organizations/org/picture.jpg'
    );

    expect(organizationRepository.setOrganizationPictureUrl).toHaveBeenCalledWith(
      organizationId,
      '/storage/organizations/org/picture.jpg',
      undefined
    );
    expect(audit.logUpdate).toHaveBeenCalledWith(
      organizationId,
      { id: organizationId, pictureUrl: null },
      { id: organizationId, pictureUrl: '/storage/organizations/org/picture.jpg' },
      { context: 'OrganizationService.setOrganizationPictureUrl' },
      undefined
    );
    expect(updated.pictureUrl).toBe('/storage/organizations/org/picture.jpg');
  });
});
