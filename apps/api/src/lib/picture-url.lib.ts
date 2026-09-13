import type { IFileStorageService } from '@grantjs/core';

/** Client-supplied / IdP URLs stored in `picture_url`. */
export const STORED_PICTURE_URL_MAX_LENGTH = 500;

/** Object keys stored in `picture_path`. */
export const STORED_PICTURE_PATH_MAX_LENGTH = 1024;

/**
 * Derived public `pictureUrl` after `getUrl()`. S3 presigned GETs measured at
 * 1275 characters; 2048 is the bound already used on membership REST updates.
 */
export const DERIVED_PICTURE_URL_MAX_LENGTH = 2048;

export type StoredPicture = {
  pictureUrl?: string | null;
  picturePath?: string | null;
};

export async function effectivePictureUrl(
  storage: Pick<IFileStorageService, 'getUrl'>,
  row: StoredPicture | null | undefined
): Promise<string | null> {
  if (!row) {
    return null;
  }
  if (row.picturePath) {
    return storage.getUrl(row.picturePath);
  }
  return row.pictureUrl ?? null;
}

export async function hydratePictureUrl<T extends StoredPicture>(
  storage: Pick<IFileStorageService, 'getUrl'>,
  row: T
): Promise<T> {
  row.pictureUrl = await effectivePictureUrl(storage, row);
  delete row.picturePath;
  return row;
}

export async function hydratePictureUrls<T extends StoredPicture>(
  storage: Pick<IFileStorageService, 'getUrl'>,
  rows: T[]
): Promise<T[]> {
  await Promise.all(rows.map((row) => hydratePictureUrl(storage, row)));
  return rows;
}

/** When a client sets `pictureUrl` without a path, the stored object must not win. */
export function picturePathWhenSettingUrl<T extends StoredPicture>(input: T): T {
  if (input.pictureUrl !== undefined && input.picturePath === undefined) {
    return { ...input, picturePath: null };
  }
  return input;
}
