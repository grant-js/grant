import { MutationResolvers } from '@logusgraphics/grant-schema';

import { config } from '@/config';
import { GraphqlContext } from '@/graphql/types';
import { BadRequestError } from '@/lib/errors';

export const uploadUserPictureResolver: MutationResolvers<GraphqlContext>['uploadUserPicture'] =
  async (_parent, { input }, context) => {
    if (!context.user) {
      throw new BadRequestError('Authentication required', 'errors:auth.required');
    }

    if (
      !config.storage.upload.allowedTypes.includes(
        input.contentType as (typeof config.storage.upload.allowedTypes)[number]
      )
    ) {
      throw new BadRequestError(
        `Invalid file type. Allowed types: ${config.storage.upload.allowedTypes.join(', ')}`,
        'errors:validation.invalid',
        { field: 'contentType' }
      );
    }

    const fileExtension = input.filename.split('.').pop()?.toLowerCase();
    if (
      !fileExtension ||
      !config.storage.upload.allowedExtensions.includes(
        fileExtension as (typeof config.storage.upload.allowedExtensions)[number]
      )
    ) {
      throw new BadRequestError(
        `Invalid file extension. Allowed extensions: ${config.storage.upload.allowedExtensions.join(', ')}`,
        'errors:validation.invalid',
        { field: 'filename' }
      );
    }

    let fileBuffer: Buffer;
    try {
      const base64Data = input.file.replace(/^data:.*,/, '');
      fileBuffer = Buffer.from(base64Data, 'base64');
    } catch {
      throw new BadRequestError('Invalid base64 file data', 'errors:validation.invalid', {
        field: 'file',
      });
    }

    if (fileBuffer.length > config.storage.upload.maxFileSize) {
      throw new BadRequestError(
        `File size exceeds maximum of ${config.storage.upload.maxFileSize / 1024 / 1024}MB`,
        'errors:validation.invalid',
        { field: 'file' }
      );
    }

    const result = await context.handlers.users.uploadUserPicture({
      userId: input.userId,
      file: fileBuffer,
      contentType: input.contentType,
      filename: input.filename,
    });

    return result;
  };
