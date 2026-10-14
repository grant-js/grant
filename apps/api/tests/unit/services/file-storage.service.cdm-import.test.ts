/**
 * A CDM import object is unredacted and read only by the worker, so the application service
 * that fronts the storage adapter refuses to mint a URL to one (ADR 0009). Bucket policy
 * does not cover it: with no public base URL the S3 adapter would sign a one-hour GET for any
 * key, and the local adapter's `getUrl()` is a `/storage/...` path.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const adapter = vi.hoisted(() => ({
  getUrl: vi.fn(),
  download: vi.fn(),
  delete: vi.fn(),
  getMetadata: vi.fn(),
  getUploadUrl: vi.fn(),
}));

vi.mock('@/lib/storage', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/storage')>()),
  StorageFactory: { createStorageService: () => adapter },
}));

vi.mock('@/lib/logger', () => ({
  loggerFactory: { createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }) },
}));

const { FileStorageService } = await import('@/services/file-storage.service');

describe('FileStorageService.getUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adapter.getUrl.mockResolvedValue('https://example.invalid/x');
  });

  it.each(['imports/projects/p/u.json', 'IMPORTS/projects/p/u.json', 'imports/anything'])(
    'refuses %s without asking the adapter',
    async (key) => {
      const service = new FileStorageService();

      await expect(service.getUrl(key)).rejects.toThrow(/no URL/);

      expect(adapter.getUrl).not.toHaveBeenCalled();
    }
  );

  it('still resolves every other key', async () => {
    const service = new FileStorageService();

    await expect(service.getUrl('projects/p/picture.png')).resolves.toBe(
      'https://example.invalid/x'
    );
    await expect(service.getUrl('imports-archive/x.png')).resolves.toBe(
      'https://example.invalid/x'
    );
  });

  it('can still read and delete an import object, which is what the worker does', async () => {
    const service = new FileStorageService();
    adapter.download.mockResolvedValue(Buffer.from('{}'));

    await service.download('imports/projects/p/u.json', { maxBytes: 10 });
    await service.delete('imports/projects/p/u.json');

    expect(adapter.download).toHaveBeenCalledWith('imports/projects/p/u.json', { maxBytes: 10 });
    expect(adapter.delete).toHaveBeenCalledWith('imports/projects/p/u.json');
  });
});
