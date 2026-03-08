---
title: File Storage
description: Adapter-based file storage for user uploads
---

# File Storage

Grant uses file storage for user-facing uploads such as profile pictures. The storage layer follows the same adapter pattern as the rest of the platform — a port defined in `@grantjs/core`, with swappable adapters in `@grantjs/storage`.

## Adapters

| Adapter   | Provider value | Best for                                                                                          |
| --------- | -------------- | ------------------------------------------------------------------------------------------------- |
| **Local** | `local`        | Development, single-server deployments, Docker volumes, NFS mounts                                |
| **S3**    | `s3`           | Production, multi-server deployments, S3-compatible services (AWS S3, MinIO, DigitalOcean Spaces) |

Switching adapters requires only an environment variable change — no code changes. Existing files must be migrated manually.

## Configuration

### Local storage

```bash
STORAGE_PROVIDER=local
STORAGE_LOCAL_BASE_PATH=./storage    # or /app/storage in Docker
```

The path can point to any mounted filesystem (local directory, Docker volume, NFS mount).

### S3 storage

```bash
STORAGE_PROVIDER=s3
STORAGE_S3_BUCKET=my-bucket
STORAGE_S3_REGION=us-east-1
STORAGE_S3_ACCESS_KEY_ID=your-access-key
STORAGE_S3_SECRET_ACCESS_KEY=your-secret-key
STORAGE_S3_ENDPOINT=https://minio.example.com   # optional: S3-compatible endpoint
STORAGE_S3_PUBLIC_URL=https://cdn.example.com    # optional: CDN base URL
```

When `STORAGE_S3_PUBLIC_URL` is set, public file URLs use this base instead of the S3 bucket URL — useful for CloudFront or other CDN distributions.

### Upload constraints

| Variable                       | Default          | Description                  |
| ------------------------------ | ---------------- | ---------------------------- |
| `STORAGE_UPLOAD_MAX_FILE_SIZE` | `5242880` (5 MB) | Maximum upload size in bytes |

Allowed MIME types and file extensions are configured in `env.config.ts`. By default, only image types are permitted: `image/jpeg`, `image/png`, `image/gif`, `image/webp`.

## Adapter Interface

Both adapters implement the `IFileStorageService` port from `@grantjs/core`:

```typescript
interface IFileStorageService {
  upload(file: Buffer, path: string, options?: UploadOptions): Promise<UploadResult>;
  delete(path: string): Promise<void>;
  getUrl(path: string): Promise<string>;
  exists(path: string): Promise<boolean>;
  copy(sourcePath: string, destinationPath: string): Promise<void>;
}
```

The API wraps this in a `FileStorageService` (`apps/api/src/services/file-storage.service.ts`) that adds validation (file type, extension, size) and base64 decoding before delegating to the adapter.

## Upload Flow

When a user uploads a profile picture, the flow is:

1. Client sends the file as a base64-encoded string with content type and filename
2. `FileStorageService.validateAndDecodeUpload()` validates the MIME type, extension, and size, then decodes the base64 payload
3. A storage path is generated: `users/{userId}/picture.{ext}`
4. The adapter uploads the file and returns a public URL
5. The user record is updated with the new `pictureUrl`

::: tip
The adapter is instantiated once at startup via `StorageFactory.createStorageService()` and receives an `ILoggerFactory` via dependency injection — it never imports the logger directly.
:::

---

**Related:**

- [Configuration](/getting-started/configuration) — All environment variables
- [Architecture Overview](/architecture/overview) — Package dependency graph
