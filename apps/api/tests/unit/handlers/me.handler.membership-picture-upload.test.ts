/**
 * The direct-upload pair for a project-membership picture.
 *
 * `projectId` is client-supplied and reaches the storage path, which makes this
 * target different from the caller's own picture: membership is what decides
 * whether the path is theirs to write. The base64 mutation can check that inside
 * its transaction, because the bytes and the write arrive together. A minted URL
 * separates them by minutes, so membership is checked twice — once before the
 * capability is issued, once before it is recorded.
 */
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const basePath = await fs.mkdtemp(path.join(os.tmpdir(), 'grant-membership-upload-'));

vi.stubEnv('STORAGE_PROVIDER', 'local');
vi.stubEnv('STORAGE_LOCAL_BASE_PATH', basePath);

const { MeHandler } = await import('@/handlers/me.handler');
const { FileStorageService } = await import('@/services/file-storage.service');

const userId = '30000000-0000-4000-8000-000000000099';
const projectId = '20000000-0000-4000-8000-000000000042';
const otherProjectId = '20000000-0000-4000-8000-000000000077';

afterAll(async () => {
  await fs.rm(basePath, { recursive: true, force: true });
  vi.unstubAllEnvs();
});

let updateProjectUserProfile: ReturnType<typeof vi.fn>;
let getUserProjectMemberships: ReturnType<typeof vi.fn>;

function createHandler() {
  const fileStorage = new FileStorageService();
  const handler = new MeHandler(
    {} as never,
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
    { getUserProjectMemberships, updateProjectUserProfile } as never,
    { getAuth: () => ({ userId }) } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    { withTransaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => fn({}) } as never
  );
  return { handler, fileStorage };
}

const validRequest = {
  projectId,
  filename: 'badge.png',
  contentType: 'image/png',
  contentLength: 4096,
};

const storedPath = `users/${userId}/projects/${projectId}/picture.png`;

beforeEach(() => {
  updateProjectUserProfile = vi.fn().mockResolvedValue(undefined);
  getUserProjectMemberships = vi.fn().mockResolvedValue([{ projectId }]);
});

describe('requestMyProjectMembershipPictureUploadUrl', () => {
  it('refuses to mint for a project the caller does not belong to', async () => {
    // The reason membership is checked before minting rather than only at confirm:
    // a URL is a write capability, so the point is not to issue it.
    getUserProjectMemberships.mockResolvedValue([{ projectId: otherProjectId }]);
    const { handler } = createHandler();

    await expect(handler.requestMyProjectMembershipPictureUploadUrl(validRequest)).rejects.toThrow(
      /ProjectUser/
    );
  });

  it('binds the URL to both the caller and the project', async () => {
    const { handler } = createHandler();

    const minted = await handler.requestMyProjectMembershipPictureUploadUrl(validRequest);

    expect(minted.url).toContain(`users/${userId}/projects/${projectId}/picture.png`);
  });

  it('still applies the upload policy', async () => {
    const { handler } = createHandler();

    await expect(
      handler.requestMyProjectMembershipPictureUploadUrl({
        ...validRequest,
        contentType: 'application/x-sh',
        filename: 'payload.sh',
      })
    ).rejects.toThrow(/Invalid file type/);
  });

  it('records nothing on the membership', async () => {
    const { handler } = createHandler();

    await handler.requestMyProjectMembershipPictureUploadUrl(validRequest);

    expect(updateProjectUserProfile).not.toHaveBeenCalled();
  });
});

describe('confirmMyProjectMembershipPictureUpload', () => {
  it('refuses when membership was revoked while the URL was still live', async () => {
    // The gap a mint/confirm split creates and base64 never had: authorization at
    // mint time does not survive to the write. The object exists here — only the
    // membership is gone — so nothing but this re-check stops the write.
    const { handler, fileStorage } = createHandler();
    await fileStorage.upload(Buffer.from('png-bytes'), storedPath, { contentType: 'image/png' });
    getUserProjectMemberships.mockResolvedValue([]);

    await expect(
      handler.confirmMyProjectMembershipPictureUpload({ projectId, filename: 'badge.png' })
    ).rejects.toThrow(/ProjectUser/);
    expect(updateProjectUserProfile).not.toHaveBeenCalled();
  });

  it('refuses when nothing was uploaded', async () => {
    const { handler } = createHandler();

    await expect(
      handler.confirmMyProjectMembershipPictureUpload({
        projectId: otherProjectId,
        filename: 'badge.png',
      })
    ).rejects.toThrow(/No uploaded file found/);
    expect(updateProjectUserProfile).not.toHaveBeenCalled();
  });

  it('writes the membership picture once the object is really there', async () => {
    const { handler, fileStorage } = createHandler();
    await fileStorage.upload(Buffer.from('png-bytes'), storedPath, { contentType: 'image/png' });

    const result = await handler.confirmMyProjectMembershipPictureUpload({
      projectId,
      filename: 'badge.png',
    });

    expect(result.path).toBe(storedPath);
    expect(updateProjectUserProfile).toHaveBeenCalledWith(
      { projectId, userId, pictureUrl: result.url },
      expect.anything()
    );
  });

  it('confirms the same path the request minted', async () => {
    const { handler, fileStorage } = createHandler();
    const minted = await handler.requestMyProjectMembershipPictureUploadUrl(validRequest);
    await fileStorage.upload(Buffer.from('png-bytes'), storedPath, { contentType: 'image/png' });

    const result = await handler.confirmMyProjectMembershipPictureUpload({
      projectId,
      filename: validRequest.filename,
    });

    expect(minted.url).toContain(result.path);
  });
});
