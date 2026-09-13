import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DERIVED_PICTURE_URL_MAX_LENGTH,
  STORED_PICTURE_URL_MAX_LENGTH,
} from '@/lib/picture-url.lib';
import { organizationSchema as restOrganizationSchema } from '@/rest/schemas/organizations.schemas';
import { OrganizationService } from '@/services/organizations.service';

const organizationId = '11111111-1111-4111-8111-111111111111';
const now = new Date('2026-09-13T12:00:00.000Z');
const longDerivedUrl = `https://s3.eu-central-1.amazonaws.com/${'x'.repeat(1200)}`;

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

describe('OrganizationService derived pictureUrl', () => {
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
    getUrl: vi.fn(async () => longDerivedUrl),
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
    expect(longDerivedUrl.length).toBeGreaterThan(STORED_PICTURE_URL_MAX_LENGTH);
    expect(longDerivedUrl.length).toBeLessThanOrEqual(DERIVED_PICTURE_URL_MAX_LENGTH);
    organizationUserRepository.getUserOrganizationMemberships.mockResolvedValue([
      { organizationId },
    ]);
    organizationRepository.getOrganizations.mockResolvedValue({
      organizations: [org(null, 'organizations/org/picture.jpg')],
      totalCount: 1,
      hasNextPage: false,
    });
  });

  it('hydrates a >500-character URL after stored-column validatePage', async () => {
    const page = await svc().getOrganizations({ limit: 20 });

    expect(page.organizations[0].pictureUrl).toBe(longDerivedUrl);
    expect(fileStorage.getUrl).toHaveBeenCalledWith('organizations/org/picture.jpg');
  });

  it('accepts the derived URL on the REST response schema', () => {
    const parsed = restOrganizationSchema.safeParse({
      id: organizationId,
      name: 'Acme',
      slug: 'acme',
      pictureUrl: longDerivedUrl,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      deletedAt: null,
    });

    expect(parsed.success).toBe(true);
  });

  it('fails if the public REST field is still capped at the stored-column max', () => {
    const publicMax = restOrganizationSchema.shape.pictureUrl;
    const storedOnly = publicMax.safeParse('https://cdn.example/logo.png');
    const derived = publicMax.safeParse(longDerivedUrl);
    const tooLongForStored = longDerivedUrl.length > STORED_PICTURE_URL_MAX_LENGTH;

    expect(storedOnly.success).toBe(true);
    expect(tooLongForStored).toBe(true);
    expect(derived.success).toBe(true);
    expect(longDerivedUrl.length).toBeGreaterThan(STORED_PICTURE_URL_MAX_LENGTH);
  });

  it('clears picturePath when setOrganizationPicture is given a client URL', async () => {
    organizationRepository.getOrganizations.mockResolvedValue({
      organizations: [org(null, 'organizations/org/picture.jpg')],
      totalCount: 1,
      hasNextPage: false,
    });
    organizationRepository.setOrganizationPicture.mockResolvedValue(
      org('https://cdn.example/logo.png', null)
    );

    await svc().setOrganizationPicture(organizationId, {
      pictureUrl: 'https://cdn.example/logo.png',
    });

    expect(organizationRepository.setOrganizationPicture).toHaveBeenCalledWith(
      organizationId,
      { pictureUrl: 'https://cdn.example/logo.png', picturePath: null },
      undefined
    );
  });
});
