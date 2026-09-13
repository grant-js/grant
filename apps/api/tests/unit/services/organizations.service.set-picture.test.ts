import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OrganizationService } from '@/services/organizations.service';

const organizationId = '11111111-1111-4111-8111-111111111111';
const now = new Date('2026-09-11T12:00:00.000Z');

function org(pictureUrl: string | null, picturePath: string | null = null) {
  return {
    id: organizationId,
    name: 'Acme',
    slug: 'acme',
    requireMfaForSensitiveActions: false,
    pictureUrl,
    picturePath,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

describe('OrganizationService.setOrganizationPicture', () => {
  const audit = {
    logUpdate: vi.fn(),
    logCreate: vi.fn(),
    logSoftDelete: vi.fn(),
    logHardDelete: vi.fn(),
  };
  const organizationRepository = {
    getOrganizations: vi.fn(),
    setOrganizationPicture: vi.fn(),
  };
  const organizationUserRepository = {
    getUserOrganizationMemberships: vi.fn(),
  };
  const fileStorage = {
    getUrl: vi.fn(async (path: string) => `/storage/${path}`),
  };

  function svc() {
    return new OrganizationService(
      organizationRepository as never,
      organizationUserRepository as never,
      { userId: 'u1' } as never,
      audit as never,
      { publish: vi.fn() } as never,
      fileStorage as never
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    organizationRepository.getOrganizations.mockResolvedValue({
      organizations: [org(null)],
      totalCount: 1,
      hasNextPage: false,
    });
    organizationRepository.setOrganizationPicture.mockResolvedValue(
      org(null, 'organizations/org/picture.jpg')
    );
  });

  it('stores picturePath and derives pictureUrl on the way out', async () => {
    const service = svc();
    const updated = await service.setOrganizationPicture(organizationId, {
      picturePath: 'organizations/org/picture.jpg',
    });

    expect(organizationRepository.setOrganizationPicture).toHaveBeenCalledWith(
      organizationId,
      { picturePath: 'organizations/org/picture.jpg' },
      undefined
    );
    expect(audit.logUpdate).toHaveBeenCalledWith(
      organizationId,
      { id: organizationId, pictureUrl: null },
      { id: organizationId, pictureUrl: null },
      { context: 'OrganizationService.setOrganizationPicture' },
      undefined
    );
    expect(updated.pictureUrl).toBe('/storage/organizations/org/picture.jpg');
  });
});
