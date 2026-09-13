/**
 * The direct-upload pair on `MeHandler`, and specifically the thing part D moves:
 * with a presigned PUT the bytes never reach this process, so every check
 * `validateAndDecodeUpload` runs *after* decoding has to run *before* a URL exists,
 * or not at all.
 *
 * Backed by a real `FileStorageService` over a temp directory rather than a mock of
 * it: the assertions here are about which inputs are refused and which path they are
 * bound to, and a mocked storage service would be asserting the mock's rules.
 */
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const basePath = await fs.mkdtemp(path.join(os.tmpdir(), 'grant-me-upload-'));

vi.stubEnv('STORAGE_PROVIDER', 'local');
vi.stubEnv('STORAGE_LOCAL_BASE_PATH', basePath);

const { MeHandler } = await import('@/handlers/me.handler');
const { FileStorageService } = await import('@/services/file-storage.service');
const { config } = await import('@/config');

const userId = '30000000-0000-4000-8000-000000000099';
const otherUserId = '30000000-0000-4000-8000-000000000011';

afterAll(async () => {
  await fs.rm(basePath, { recursive: true, force: true });
  vi.unstubAllEnvs();
});

let updateUser: ReturnType<typeof vi.fn>;

function createHandler(authUserId: string | null = userId) {
  const fileStorage = new FileStorageService();
  const auth = { getAuth: () => (authUserId ? { userId: authUserId } : null) };
  const users = { updateUser };
  const db = {
    withTransaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => fn({}),
  };

  const handler = new MeHandler(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    users as never,
    {} as never,
    {} as never,
    {} as never,
    fileStorage as never,
    {} as never,
    {} as never,
    {} as never,
    auth as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    db as never
  );

  return { handler, fileStorage };
}

const validRequest = {
  filename: 'profile.jpg',
  contentType: 'image/jpeg',
  contentLength: 2048,
};

beforeEach(() => {
  updateUser = vi.fn().mockResolvedValue(undefined);
});

describe('requestMyUserPictureUploadUrl — the checks that used to run after decoding', () => {
  it('refuses a content type outside the upload policy', async () => {
    const { handler } = createHandler();

    await expect(
      handler.requestMyUserPictureUploadUrl({
        ...validRequest,
        contentType: 'application/x-sh',
        filename: 'payload.sh',
      })
    ).rejects.toThrow(/Invalid file type/);
  });

  it('refuses an extension outside the upload policy', async () => {
    // Content type and extension are checked separately, so a permitted type with a
    // forbidden extension is still refused — the same pairing the base64 path makes.
    const { handler } = createHandler();

    await expect(
      handler.requestMyUserPictureUploadUrl({ ...validRequest, filename: 'payload.sh' })
    ).rejects.toThrow(/Invalid file extension/);
  });

  it('refuses a declared size above the policy maximum', async () => {
    const { handler } = createHandler();

    await expect(
      handler.requestMyUserPictureUploadUrl({
        ...validRequest,
        contentLength: config.storage.upload.maxFileSize + 1,
      })
    ).rejects.toThrow(/exceeds maximum/);
  });

  it.each([0, -1, 1.5])('refuses a declared size of %s', async (contentLength) => {
    const { handler } = createHandler();

    await expect(
      handler.requestMyUserPictureUploadUrl({ ...validRequest, contentLength })
    ).rejects.toThrow(/positive whole number/);
  });

  it('refuses to issue anything at all when not authenticated', async () => {
    const { handler } = createHandler(null);

    await expect(handler.requestMyUserPictureUploadUrl(validRequest)).rejects.toThrow(
      /Not authenticated/
    );
  });

  it('binds the URL to a path derived from the caller, not from the filename', async () => {
    // The tenancy boundary. Nothing the client sends may steer the path; only the
    // extension is taken from `filename`.
    const { handler } = createHandler();

    const minted = await handler.requestMyUserPictureUploadUrl({
      ...validRequest,
      filename: '../../../../etc/passwd.jpg',
    });

    expect(minted.url).toContain(`users/${userId}/picture.jpg`);
    expect(minted.url).not.toContain('etc/passwd');
  });

  it('issues a different path for a different caller', async () => {
    const mine = await createHandler(userId).handler.requestMyUserPictureUploadUrl(validRequest);
    const theirs =
      await createHandler(otherUserId).handler.requestMyUserPictureUploadUrl(validRequest);

    expect(mine.url).toContain(userId);
    expect(theirs.url).toContain(otherUserId);
    expect(mine.url).not.toContain(otherUserId);
  });

  it('applies the configured expiry', async () => {
    const before = Date.now();
    const { handler } = createHandler();

    const minted = await handler.requestMyUserPictureUploadUrl(validRequest);

    const expected = before + config.storage.upload.urlExpirySeconds * 1000;
    expect(Math.abs(minted.expiresAt.getTime() - expected)).toBeLessThanOrEqual(2_000);
  });

  it('returns PUT and a Content-Type header, and never asks for Content-Length', async () => {
    const { handler } = createHandler();

    const minted = await handler.requestMyUserPictureUploadUrl(validRequest);

    expect(minted.method).toBe('PUT');
    expect(minted.headers).toContainEqual({ name: 'Content-Type', value: 'image/jpeg' });
    expect(minted.headers.map((h) => h.name.toLowerCase())).not.toContain('content-length');
  });

  it('records nothing against the user — a URL is not a profile update', async () => {
    const { handler } = createHandler();

    await handler.requestMyUserPictureUploadUrl(validRequest);

    expect(updateUser).not.toHaveBeenCalled();
  });
});

describe('confirmMyUserPictureUpload — the store is the witness', () => {
  const storedPath = `users/${userId}/picture.jpg`;

  it('refuses when nothing was ever uploaded, and touches no user row', async () => {
    const { handler } = createHandler();

    await expect(handler.confirmMyUserPictureUpload({ filename: 'profile.jpg' })).rejects.toThrow(
      /No uploaded file found/
    );
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('refuses when the stored object exceeds the policy, and touches no user row', async () => {
    // Belt and braces: the URL commits to an exact length, so this should be
    // unreachable through a minted URL. It is asserted anyway because "unreachable"
    // is a claim about the store's enforcement, and on S3 this repository cannot
    // demonstrate that enforcement at all (ADR 0007).
    const { handler, fileStorage } = createHandler();
    await fileStorage.upload(Buffer.alloc(config.storage.upload.maxFileSize + 1), storedPath, {
      contentType: 'image/jpeg',
    });

    await expect(handler.confirmMyUserPictureUpload({ filename: 'profile.jpg' })).rejects.toThrow(
      /exceeds maximum/
    );
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('points the user picture at the stored object once it is really there', async () => {
    const { handler, fileStorage } = createHandler();
    await fileStorage.upload(Buffer.from('jpeg-bytes'), storedPath, {
      contentType: 'image/jpeg',
    });

    const result = await handler.confirmMyUserPictureUpload({ filename: 'profile.jpg' });

    expect(result.path).toBe(storedPath);
    expect(updateUser).toHaveBeenCalledWith(userId, { picturePath: storedPath }, expect.anything());
    expect(updateUser).not.toHaveBeenCalledWith(
      userId,
      expect.objectContaining({ pictureUrl: result.url }),
      expect.anything()
    );
  });

  it('confirms the same path the request minted', async () => {
    // The invariant the whole pair rests on. Both derive the path from the
    // authenticated id and the extension; if they ever disagree, a confirmation
    // silently describes a different object than the one the client wrote.
    const { handler, fileStorage } = createHandler();
    const minted = await handler.requestMyUserPictureUploadUrl(validRequest);
    await fileStorage.upload(Buffer.from('jpeg-bytes'), storedPath, {
      contentType: 'image/jpeg',
    });

    const result = await handler.confirmMyUserPictureUpload({ filename: validRequest.filename });

    expect(minted.url).toContain(result.path);
  });

  it('refuses to confirm anything when not authenticated', async () => {
    const { handler } = createHandler(null);

    await expect(handler.confirmMyUserPictureUpload({ filename: 'profile.jpg' })).rejects.toThrow(
      /Not authenticated/
    );
  });
});

describe('uploadMyUserPicture — stores the object key', () => {
  it('writes picturePath, not the derived URL', async () => {
    const { handler } = createHandler();
    const file = `data:image/jpeg;base64,${Buffer.from('jpeg-bytes').toString('base64')}`;

    const result = await handler.uploadMyUserPicture({
      file,
      filename: 'profile.jpg',
      contentType: 'image/jpeg',
    });

    expect(result.path).toBe(`users/${userId}/picture.jpg`);
    expect(updateUser).toHaveBeenCalledWith(
      userId,
      { picturePath: result.path },
      expect.anything()
    );
    expect(updateUser).not.toHaveBeenCalledWith(
      userId,
      expect.objectContaining({ pictureUrl: result.url }),
      expect.anything()
    );
  });
});
