import { Tenant } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OrganizationHandler } from '@/handlers/organizations.handler';
import { BadRequestError } from '@/lib/errors';

const organizationId = '11111111-1111-4111-8111-111111111111';

function createHandler(opts?: {
  setOrganizationPicture?: ReturnType<typeof vi.fn>;
  upload?: ReturnType<typeof vi.fn>;
}) {
  const setOrganizationPicture =
    opts?.setOrganizationPicture ?? vi.fn().mockResolvedValue({ id: organizationId });
  const upload =
    opts?.upload ??
    vi.fn().mockResolvedValue({
      url: `/storage/organizations/${organizationId}/picture.jpg`,
      path: `organizations/${organizationId}/picture.jpg`,
    });

  const organizations = { setOrganizationPicture };
  const fileStorage = {
    validateAndDecodeUpload: vi.fn().mockReturnValue(Buffer.from('img')),
    sanitizeExtensionAndGeneratePath: vi
      .fn()
      .mockReturnValue(`organizations/${organizationId}/picture.jpg`),
    upload,
  };
  const db = {
    withTransaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn({})),
  };

  const unused = {} as never;

  const handler = new OrganizationHandler(
    organizations as never,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    fileStorage as never,
    unused,
    unused,
    db as never
  );

  return { handler, organizations, fileStorage, db };
}

describe('OrganizationHandler.uploadOrganizationPicture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uploads a public file and persists picturePath', async () => {
    const { handler, organizations, fileStorage } = createHandler();

    const result = await handler.uploadOrganizationPicture({
      organizationId,
      file: 'data:image/jpeg;base64,/9j/',
      filename: 'logo.jpg',
      contentType: 'image/jpeg',
      scope: { tenant: Tenant.Organization, id: organizationId },
    });

    expect(fileStorage.validateAndDecodeUpload).toHaveBeenCalled();
    expect(fileStorage.sanitizeExtensionAndGeneratePath).toHaveBeenCalledWith(
      'logo.jpg',
      `organizations/${organizationId}/picture`
    );
    expect(fileStorage.upload).toHaveBeenCalledWith(expect.any(Buffer), expect.any(String), {
      contentType: 'image/jpeg',
      public: true,
    });
    expect(organizations.setOrganizationPicture).toHaveBeenCalledWith(
      organizationId,
      { picturePath: `organizations/${organizationId}/picture.jpg` },
      {}
    );
    expect(organizations.setOrganizationPicture).not.toHaveBeenCalledWith(
      organizationId,
      expect.objectContaining({
        pictureUrl: `/storage/organizations/${organizationId}/picture.jpg`,
      }),
      expect.anything()
    );
    expect(result).toEqual({
      url: `/storage/organizations/${organizationId}/picture.jpg`,
      path: `organizations/${organizationId}/picture.jpg`,
    });
  });

  it('rejects when organizationId does not match organization scope', async () => {
    const { handler, organizations, fileStorage } = createHandler();

    await expect(
      handler.uploadOrganizationPicture({
        organizationId,
        file: 'data:image/jpeg;base64,/9j/',
        filename: 'logo.jpg',
        contentType: 'image/jpeg',
        scope: { tenant: Tenant.Organization, id: '22222222-2222-4222-8222-222222222222' },
      })
    ).rejects.toBeInstanceOf(BadRequestError);

    expect(fileStorage.upload).not.toHaveBeenCalled();
    expect(organizations.setOrganizationPicture).not.toHaveBeenCalled();
  });

  it('does not persist picturePath when storage upload fails', async () => {
    const setOrganizationPicture = vi.fn();
    const { handler, organizations } = createHandler({
      setOrganizationPicture,
      upload: vi.fn().mockRejectedValue(new Error('storage down')),
    });

    await expect(
      handler.uploadOrganizationPicture({
        organizationId,
        file: 'data:image/jpeg;base64,/9j/',
        filename: 'logo.jpg',
        contentType: 'image/jpeg',
        scope: { tenant: Tenant.Organization, id: organizationId },
      })
    ).rejects.toThrow('storage down');

    expect(organizations.setOrganizationPicture).not.toHaveBeenCalled();
  });
});
