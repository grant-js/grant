import { Tenant } from '@grantjs/schema';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const basePath = await fs.mkdtemp(path.join(os.tmpdir(), 'grant-org-direct-upload-'));

vi.stubEnv('STORAGE_PROVIDER', 'local');
vi.stubEnv('STORAGE_LOCAL_BASE_PATH', basePath);

const { OrganizationHandler } = await import('@/handlers/organizations.handler');
const { FileStorageService } = await import('@/services/file-storage.service');
const { config } = await import('@/config');

const organizationId = '11111111-1111-4111-8111-111111111111';
const otherOrganizationId = '22222222-2222-4222-8222-222222222222';
const storedPath = `organizations/${organizationId}/picture.jpg`;

afterAll(async () => {
  await fs.rm(basePath, { recursive: true, force: true });
  vi.unstubAllEnvs();
});

let setOrganizationPicture: ReturnType<typeof vi.fn>;

function createHandler() {
  const fileStorage = new FileStorageService();
  const organizations = { setOrganizationPicture };
  const handler = new OrganizationHandler(
    organizations as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    fileStorage as never,
    {} as never,
    {} as never,
    { withTransaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => fn({}) } as never
  );
  return { handler, organizations, fileStorage };
}

const validRequest = {
  organizationId,
  filename: 'logo.jpg',
  contentType: 'image/jpeg',
  contentLength: 2048,
  scope: { tenant: Tenant.Organization, id: organizationId },
};

beforeEach(() => {
  setOrganizationPicture = vi.fn().mockResolvedValue({ id: organizationId });
});

describe('requestOrganizationPictureUploadUrl', () => {
  it('refuses a content type outside the upload policy', async () => {
    const { handler } = createHandler();

    await expect(
      handler.requestOrganizationPictureUploadUrl({
        ...validRequest,
        contentType: 'application/x-sh',
        filename: 'payload.sh',
      })
    ).rejects.toThrow(/Invalid file type/);
  });

  it('refuses when organizationId does not match organization scope', async () => {
    const { handler } = createHandler();

    await expect(
      handler.requestOrganizationPictureUploadUrl({
        ...validRequest,
        scope: { tenant: Tenant.Organization, id: otherOrganizationId },
      })
    ).rejects.toThrow(/Organization id must match scope/);
  });

  it('binds the URL to the organization, not the filename path', async () => {
    const { handler } = createHandler();

    const minted = await handler.requestOrganizationPictureUploadUrl({
      ...validRequest,
      filename: '../../../../etc/passwd.jpg',
    });

    expect(minted.url).toContain(`organizations/${organizationId}/picture.jpg`);
    expect(minted.url).not.toContain('etc/passwd');
  });

  it('records nothing against the organization', async () => {
    const { handler } = createHandler();

    await handler.requestOrganizationPictureUploadUrl(validRequest);

    expect(setOrganizationPicture).not.toHaveBeenCalled();
  });

  it('applies the configured expiry', async () => {
    const before = Date.now();
    const { handler } = createHandler();

    const minted = await handler.requestOrganizationPictureUploadUrl(validRequest);

    const expected = before + config.storage.upload.urlExpirySeconds * 1000;
    expect(Math.abs(minted.expiresAt.getTime() - expected)).toBeLessThanOrEqual(2_000);
  });
});

describe('confirmOrganizationPictureUpload', () => {
  it('refuses when nothing was uploaded, and touches no organization row', async () => {
    const { handler } = createHandler();

    await expect(
      handler.confirmOrganizationPictureUpload({
        organizationId,
        filename: 'logo.jpg',
        scope: { tenant: Tenant.Organization, id: organizationId },
      })
    ).rejects.toThrow(/No uploaded file found/);
    expect(setOrganizationPicture).not.toHaveBeenCalled();
  });

  it('writes picturePath once the object is really there', async () => {
    const { handler, fileStorage } = createHandler();
    await fileStorage.upload(Buffer.from('jpeg-bytes'), storedPath, { contentType: 'image/jpeg' });

    const result = await handler.confirmOrganizationPictureUpload({
      organizationId,
      filename: 'logo.jpg',
      scope: { tenant: Tenant.Organization, id: organizationId },
    });

    expect(result.path).toBe(storedPath);
    expect(setOrganizationPicture).toHaveBeenCalledWith(
      organizationId,
      { picturePath: storedPath },
      expect.anything()
    );
    expect(setOrganizationPicture).not.toHaveBeenCalledWith(
      organizationId,
      expect.objectContaining({ pictureUrl: result.url }),
      expect.anything()
    );
  });

  it('confirms the same path the request minted', async () => {
    const { handler, fileStorage } = createHandler();
    const minted = await handler.requestOrganizationPictureUploadUrl(validRequest);
    await fileStorage.upload(Buffer.from('jpeg-bytes'), storedPath, { contentType: 'image/jpeg' });

    const result = await handler.confirmOrganizationPictureUpload({
      organizationId,
      filename: validRequest.filename,
      scope: validRequest.scope,
    });

    expect(minted.url).toContain(result.path);
  });
});
