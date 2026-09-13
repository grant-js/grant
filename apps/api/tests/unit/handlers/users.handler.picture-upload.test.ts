/**
 * The direct-upload pair for an administrator setting another user's picture.
 *
 * This target is the one where the permission check *is* the tenancy boundary. The
 * `me` mutations derive the storage path from the caller, so a caller can only ever
 * reach their own object however the input is shaped. Here the path comes from the
 * **target** `userId`, so nothing about the path constrains who may write it, and
 * `assertMayWriteUserPicture` is the whole of the protection — which is why it runs
 * before a URL is minted, and again before the upload is recorded.
 */
import { Tenant } from '@grantjs/schema';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const basePath = await fs.mkdtemp(path.join(os.tmpdir(), 'grant-admin-upload-'));

vi.stubEnv('STORAGE_PROVIDER', 'local');
vi.stubEnv('STORAGE_LOCAL_BASE_PATH', basePath);

const { UserHandler } = await import('@/handlers/users.handler');
const { FileStorageService } = await import('@/services/file-storage.service');

const actorUserId = '30000000-0000-4000-8000-0000000000aa';
const targetUserId = '30000000-0000-4000-8000-0000000000bb';
const organizationId = '10000000-0000-4000-8000-000000000001';
const accountId = '10000000-0000-4000-8000-000000000002';
const projectId = '20000000-0000-4000-8000-000000000042';

const orgScope = { tenant: Tenant.Organization, id: organizationId };
// Project scopes carry a composite id: `accountId:projectId`.
const projectScope = { tenant: Tenant.OrganizationProject, id: `${accountId}:${projectId}` };
const leafScope = {
  tenant: Tenant.OrganizationProjectUser,
  id: `${accountId}:${projectId}:${targetUserId}`,
};

afterAll(async () => {
  await fs.rm(basePath, { recursive: true, force: true });
  vi.unstubAllEnvs();
});

let updateUser: ReturnType<typeof vi.fn>;
let updateProjectUserProfile: ReturnType<typeof vi.fn>;
let getUserAuthenticationMethods: ReturnType<typeof vi.fn>;

function createHandler() {
  const fileStorage = new FileStorageService();
  const cache = { permissions: { keys: vi.fn().mockResolvedValue([]), delete: vi.fn() } };

  const handler = new UserHandler(
    {} as never,
    { updateUser } as never,
    {} as never,
    { updateProjectUserProfile } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    { getUserAuthenticationMethods } as never,
    fileStorage as never,
    cache as never,
    {} as never,
    { withTransaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => fn({}) } as never
  );
  return { handler, fileStorage };
}

const validRequest = {
  scope: orgScope,
  userId: targetUserId,
  filename: 'portrait.png',
  contentType: 'image/png',
  contentLength: 4096,
  actorUserId,
};

const storedPath = `users/${targetUserId}/picture.png`;

beforeEach(() => {
  updateUser = vi.fn().mockResolvedValue(undefined);
  updateProjectUserProfile = vi.fn().mockResolvedValue(undefined);
  // No authentication methods: the target is an administered identity, so an
  // administrator may write it. The opposite case is asserted below.
  getUserAuthenticationMethods = vi.fn().mockResolvedValue([]);
});

describe('requestUserPictureUploadUrl — authorization before the capability', () => {
  it('refuses a leaf scope, before minting anything', async () => {
    const { handler } = createHandler();

    await expect(
      handler.requestUserPictureUploadUrl({ ...validRequest, scope: leafScope })
    ).rejects.toThrow(/OrganizationProject or AccountProject scope/);
  });

  it('refuses to mint for a self-managed identity the caller is not', async () => {
    // The rule `uploadUserPicture` already enforces: a user who holds their own
    // authentication methods owns their own identity. Minting a URL for them would
    // hand out a write capability the base64 route would have refused.
    getUserAuthenticationMethods.mockResolvedValue([{ id: 'auth-method' }]);
    const { handler } = createHandler();

    await expect(handler.requestUserPictureUploadUrl(validRequest)).rejects.toThrow(
      /another user identity/
    );
  });

  it('allows a self-managed identity to be written by that user themselves', async () => {
    getUserAuthenticationMethods.mockResolvedValue([{ id: 'auth-method' }]);
    const { handler } = createHandler();

    const minted = await handler.requestUserPictureUploadUrl({
      ...validRequest,
      userId: actorUserId,
    });

    expect(minted.url).toContain(`users/${actorUserId}/picture.png`);
  });

  it('binds the URL to the target user, not to the caller', async () => {
    // The tenancy assertion for this target. The path is the *subject's*, which is
    // exactly why the permission check above is load-bearing.
    const { handler } = createHandler();

    const minted = await handler.requestUserPictureUploadUrl(validRequest);

    expect(minted.url).toContain(`users/${targetUserId}/picture.png`);
    expect(minted.url).not.toContain(actorUserId);
  });

  it('still applies the upload policy', async () => {
    const { handler } = createHandler();

    await expect(
      handler.requestUserPictureUploadUrl({
        ...validRequest,
        contentType: 'application/x-sh',
        filename: 'payload.sh',
      })
    ).rejects.toThrow(/Invalid file type/);
  });

  it('writes nothing anywhere', async () => {
    const { handler } = createHandler();

    await handler.requestUserPictureUploadUrl(validRequest);

    expect(updateUser).not.toHaveBeenCalled();
    expect(updateProjectUserProfile).not.toHaveBeenCalled();
  });
});

describe('confirmUserPictureUpload — authorization again, before the write', () => {
  const confirmInput = {
    scope: orgScope,
    userId: targetUserId,
    filename: 'portrait.png',
    actorUserId,
  };

  it('refuses when the target became self-managed while the URL was live', async () => {
    // The gap the mint/confirm split creates. The object exists and the URL was
    // legitimately issued; only the authorization changed in between. Re-running the
    // check is the only thing that stops the write.
    const { handler, fileStorage } = createHandler();
    await fileStorage.upload(Buffer.from('png-bytes'), storedPath, { contentType: 'image/png' });
    getUserAuthenticationMethods.mockResolvedValue([{ id: 'auth-method' }]);

    await expect(handler.confirmUserPictureUpload(confirmInput)).rejects.toThrow(
      /another user identity/
    );
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('refuses a leaf scope at confirm time too', async () => {
    const { handler, fileStorage } = createHandler();
    await fileStorage.upload(Buffer.from('png-bytes'), storedPath, { contentType: 'image/png' });

    await expect(
      handler.confirmUserPictureUpload({ ...confirmInput, scope: leafScope })
    ).rejects.toThrow(/OrganizationProject or AccountProject scope/);
  });

  it('refuses when nothing was uploaded', async () => {
    const { handler } = createHandler();

    await expect(
      handler.confirmUserPictureUpload({ ...confirmInput, filename: 'never-sent.gif' })
    ).rejects.toThrow(/No uploaded file found/);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('writes the user record in a non-pivot scope', async () => {
    const { handler, fileStorage } = createHandler();
    await fileStorage.upload(Buffer.from('png-bytes'), storedPath, { contentType: 'image/png' });

    const result = await handler.confirmUserPictureUpload(confirmInput);

    expect(result.path).toBe(storedPath);
    expect(updateUser).toHaveBeenCalledWith(
      targetUserId,
      { picturePath: storedPath },
      expect.anything()
    );
    expect(updateUser).not.toHaveBeenCalledWith(
      targetUserId,
      expect.objectContaining({ pictureUrl: result.url }),
      expect.anything()
    );
    expect(updateProjectUserProfile).not.toHaveBeenCalled();
  });

  it('writes the project membership instead, in a parent project scope', async () => {
    // The same branch `uploadUserPicture` takes. Asserted because a confirm step
    // that recorded the picture in the wrong place would look successful.
    const { handler, fileStorage } = createHandler();
    await fileStorage.upload(Buffer.from('png-bytes'), storedPath, { contentType: 'image/png' });

    const result = await handler.confirmUserPictureUpload({ ...confirmInput, scope: projectScope });

    expect(updateProjectUserProfile).toHaveBeenCalledWith(
      { projectId, userId: targetUserId, picturePath: storedPath },
      expect.anything()
    );
    expect(updateProjectUserProfile).not.toHaveBeenCalledWith(
      expect.objectContaining({ pictureUrl: result.url }),
      expect.anything()
    );
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('confirms the same path the request minted', async () => {
    const { handler, fileStorage } = createHandler();
    const minted = await handler.requestUserPictureUploadUrl(validRequest);
    await fileStorage.upload(Buffer.from('png-bytes'), storedPath, { contentType: 'image/png' });

    const result = await handler.confirmUserPictureUpload(confirmInput);

    expect(minted.url).toContain(result.path);
  });
});

describe('uploadUserPicture — stores the object key', () => {
  it('writes picturePath on the user in a non-pivot scope', async () => {
    const { handler } = createHandler();
    const file = `data:image/png;base64,${Buffer.from('png-bytes').toString('base64')}`;

    const result = await handler.uploadUserPicture({
      ...validRequest,
      file,
    });

    expect(result.path).toBe(storedPath);
    expect(updateUser).toHaveBeenCalledWith(
      targetUserId,
      { picturePath: result.path },
      expect.anything()
    );
    expect(updateUser).not.toHaveBeenCalledWith(
      targetUserId,
      expect.objectContaining({ pictureUrl: result.url }),
      expect.anything()
    );
  });

  it('writes picturePath on the membership in a parent project scope', async () => {
    const { handler } = createHandler();
    const file = `data:image/png;base64,${Buffer.from('png-bytes').toString('base64')}`;

    const result = await handler.uploadUserPicture({
      ...validRequest,
      scope: projectScope,
      file,
    });

    expect(updateProjectUserProfile).toHaveBeenCalledWith(
      { projectId, userId: targetUserId, picturePath: result.path },
      expect.anything()
    );
    expect(updateUser).not.toHaveBeenCalled();
  });
});
