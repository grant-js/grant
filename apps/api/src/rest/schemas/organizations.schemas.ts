import { OrganizationSortableField, SortOrder } from '@grantjs/schema';

import { DERIVED_PICTURE_URL_MAX_LENGTH } from '@/lib/picture-url.lib';
import { z } from '@/lib/zod-openapi.lib';
import {
  createSuccessResponseSchema,
  listQuerySchema,
  scopeSchema,
  tenantSchema,
} from '@/rest/schemas/common.schemas';

export const organizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  pictureUrl: z.string().max(DERIVED_PICTURE_URL_MAX_LENGTH).nullable().optional().openapi({
    description: 'Public URL of the organization logo',
    example: '/storage/organizations/123e4567-e89b-12d3-a456-426614174000/picture.jpg',
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const organizationWithRelationsSchema = organizationSchema.extend({
  projects: z.array(z.unknown()).optional(),
  roles: z.array(z.unknown()).optional(),
  groups: z.array(z.unknown()).optional(),
  permissions: z.array(z.unknown()).optional(),
  users: z.array(z.unknown()).optional(),
  tags: z.array(z.unknown()).optional(),
});

const organizationRelationsEnum = z.enum([
  'projects',
  'roles',
  'groups',
  'permissions',
  'users',
  'tags',
]);

export const getOrganizationsQuerySchema = listQuerySchema.omit({ relations: true }).extend({
  scopeId: z.uuid('errors.validation.invalidScopeId'),
  tenant: tenantSchema,
  sortField: z
    .enum(
      Object.values(OrganizationSortableField) as [
        OrganizationSortableField,
        ...OrganizationSortableField[],
      ]
    )
    .optional(),
  sortOrder: z.enum(Object.values(SortOrder) as [SortOrder, ...SortOrder[]]).optional(),
  relations: z
    .array(organizationRelationsEnum)
    .optional()
    .openapi({
      description: 'Related entities to include in the response',
      example: ['projects', 'users', 'tags'],
    }),
});

export const getOrganizationsResponseSchema = createSuccessResponseSchema(
  z.object({
    items: z.array(organizationWithRelationsSchema),
    totalCount: z.number(),
    hasNextPage: z.boolean(),
  })
);

export const createOrganizationRequestSchema = z.object({
  scope: scopeSchema,
  name: z
    .string()
    .min(1, 'errors.validation.nameRequired')
    .max(255, 'errors.validation.nameTooLong')
    .openapi({
      description: 'Name of the organization',
      example: 'Acme Corporation',
    }),
});

export const createOrganizationResponseSchema = createSuccessResponseSchema(organizationSchema);

export const updateOrganizationRequestSchema = z.object({
  scope: scopeSchema,
  name: z
    .string()
    .min(1, 'errors.validation.nameRequired')
    .max(255, 'errors.validation.nameTooLong')
    .optional()
    .openapi({
      description: 'Updated name of the organization',
      example: 'Acme Corp',
    }),
});

export const organizationParamsSchema = z.object({
  id: z
    .string()
    .uuid('errors.validation.invalidOrganizationId')
    .openapi({
      description: 'UUID of the organization',
      example: '123e4567-e89b-12d3-a456-426614174000',
      param: { in: 'path', name: 'id' },
    }),
});

export const updateOrganizationResponseSchema = createSuccessResponseSchema(organizationSchema);

export const deleteOrganizationQuerySchema = z.object({
  hardDelete: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

export const deleteOrganizationResponseSchema = createSuccessResponseSchema(organizationSchema);

export const uploadOrganizationPictureRequestSchema = z.object({
  scope: scopeSchema,
  file: z.string().min(1, 'errors.validation.fileRequired').openapi({
    description: 'Base64-encoded file data (with optional data URI prefix)',
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
  }),
  filename: z.string().min(1, 'errors.validation.filenameRequired').openapi({
    description: 'Original filename with extension',
    example: 'logo.jpg',
  }),
  contentType: z.string().min(1, 'errors.validation.contentTypeRequired').openapi({
    description: 'MIME type of the file',
    example: 'image/jpeg',
  }),
});

export const uploadOrganizationPictureResponseSchema = createSuccessResponseSchema(
  z.object({
    url: z.string().openapi({
      description: 'Public URL of the uploaded file',
      example: '/storage/organizations/123e4567-e89b-12d3-a456-426614174000/picture.jpg',
    }),
    path: z.string().openapi({
      description: 'Storage path of the uploaded file',
      example: 'organizations/123e4567-e89b-12d3-a456-426614174000/picture.jpg',
    }),
  }),
  'Successfully uploaded organization picture'
);

export const requestOrganizationPictureUploadUrlRequestSchema = z.object({
  scope: scopeSchema,
  filename: z.string().min(1, 'errors.validation.filenameRequired').openapi({
    description: 'Original filename with extension',
    example: 'logo.jpg',
  }),
  contentType: z.string().min(1, 'errors.validation.contentTypeRequired').openapi({
    description: 'MIME type of the file',
    example: 'image/jpeg',
  }),
  contentLength: z.number().int().positive().openapi({
    description:
      'Exact byte length the client will send. The issued URL commits to it — a body of any other length is refused by the store.',
    example: 204800,
  }),
});

export const requestOrganizationPictureUploadUrlResponseSchema = createSuccessResponseSchema(
  z.object({
    url: z.string().openapi({
      description:
        'URL to PUT the bytes to. Absolute for object stores; resolve a relative URL against the API origin.',
      example:
        '/storage/organizations/123e4567-e89b-12d3-a456-426614174000/picture.jpg?exp=1757600000&len=204800&ct=image%2Fjpeg&sig=...',
    }),
    method: z.string().openapi({ description: 'HTTP method to use', example: 'PUT' }),
    headers: z.array(z.object({ name: z.string(), value: z.string() })).openapi({
      description:
        'Headers to set verbatim on the PUT. Content-Length is deliberately absent — browsers set it from the body and forbid setting it by hand.',
      example: [{ name: 'Content-Type', value: 'image/jpeg' }],
    }),
    expiresAt: z.string().openapi({
      description: 'Instant after which the store refuses the URL',
      example: '2026-09-13T09:05:00.000Z',
    }),
  }),
  'Upload URL issued'
);

export const confirmOrganizationPictureUploadRequestSchema = z.object({
  scope: scopeSchema,
  filename: z.string().min(1, 'errors.validation.filenameRequired').openapi({
    description:
      'The same filename the URL was requested with. The storage path is re-derived from the organization id, not taken from the client, so this only selects the extension.',
    example: 'logo.jpg',
  }),
});
