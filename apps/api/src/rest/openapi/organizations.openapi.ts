import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import {
  authenticationErrorResponseSchema,
  confirmOrganizationPictureUploadRequestSchema,
  createOrganizationRequestSchema,
  createOrganizationResponseSchema,
  deleteOrganizationQuerySchema,
  deleteOrganizationResponseSchema,
  errorResponseSchema,
  getOrganizationsQuerySchema,
  getOrganizationsResponseSchema,
  notFoundErrorResponseSchema,
  organizationParamsSchema,
  organizationSchema,
  organizationWithRelationsSchema,
  requestOrganizationPictureUploadUrlRequestSchema,
  requestOrganizationPictureUploadUrlResponseSchema,
  transferOrganizationOwnershipRequestSchema,
  transferOrganizationOwnershipResponseSchema,
  updateOrganizationRequestSchema,
  updateOrganizationResponseSchema,
  uploadOrganizationPictureRequestSchema,
  uploadOrganizationPictureResponseSchema,
  validationErrorResponseSchema,
} from '@/rest/schemas';
import { createSuccessResponseSchema } from '@/rest/schemas/common.schemas';

export function registerOrganizationsOpenApi(registry: OpenAPIRegistry) {
  registry.register('Organization', organizationSchema);
  registry.register('OrganizationWithRelations', organizationWithRelationsSchema);
  registry.register('GetOrganizationsQuery', getOrganizationsQuerySchema);
  registry.register('GetOrganizationsResponse', getOrganizationsResponseSchema);
  registry.register(
    'GetOrganizationResponse',
    createSuccessResponseSchema(organizationWithRelationsSchema)
  );
  registry.register('OrganizationParams', organizationParamsSchema);
  registry.register('UploadOrganizationPictureRequest', uploadOrganizationPictureRequestSchema);
  registry.register('UploadOrganizationPictureResponse', uploadOrganizationPictureResponseSchema);
  registry.register(
    'RequestOrganizationPictureUploadUrlRequest',
    requestOrganizationPictureUploadUrlRequestSchema
  );
  registry.register(
    'RequestOrganizationPictureUploadUrlResponse',
    requestOrganizationPictureUploadUrlResponseSchema
  );
  registry.register(
    'ConfirmOrganizationPictureUploadRequest',
    confirmOrganizationPictureUploadRequestSchema
  );

  registry.register(
    'TransferOrganizationOwnershipRequest',
    transferOrganizationOwnershipRequestSchema
  );
  registry.register(
    'TransferOrganizationOwnershipResponse',
    transferOrganizationOwnershipResponseSchema
  );

  /**
   * GET /api/organizations
   */
  registry.registerPath({
    method: 'get',
    path: '/api/organizations',
    operationId: 'getApiOrganizations',
    tags: ['Organizations'],
    summary: 'List organizations',
    description: `
List organizations with optional filtering, pagination, and relation loading.

### Relations
You can load related data by specifying the \`relations\` query parameter:
- \`projects\`: Load organization's projects
- \`roles\`: Load organization's roles
- \`groups\`: Load organization's groups
- \`permissions\`: Load organization's permissions
- \`users\`: Load organization's users
- \`tags\`: Load organization's tags

Example: \`?relations=projects,users\`
    `.trim(),
    request: {
      query: getOrganizationsQuerySchema,
    },
    responses: {
      200: {
        description: 'Successfully retrieved organizations',
        content: {
          'application/json': {
            schema: getOrganizationsResponseSchema,
          },
        },
      },
      400: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: validationErrorResponseSchema,
          },
        },
      },
      401: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      500: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
    },
  });

  /**
   * GET /api/organizations/:id
   */
  registry.registerPath({
    method: 'get',
    path: '/api/organizations/{id}',
    operationId: 'getApiOrganizationsById',
    tags: ['Organizations'],
    summary: 'Get organization by ID',
    description: `
Get a single organization by ID with optional relation loading.

### Relations
You can load related data by specifying the \`relations\` query parameter:
- \`projects\`: Load organization's projects
- \`roles\`: Load organization's roles
- \`groups\`: Load organization's groups
- \`permissions\`: Load organization's permissions
- \`users\`: Load organization's users
- \`tags\`: Load organization's tags

Example: \`?relations=projects,users\`
    `.trim(),
    request: {
      params: organizationParamsSchema,
      query: getOrganizationsQuerySchema,
    },
    responses: {
      200: {
        description: 'Successfully retrieved organization',
        content: {
          'application/json': {
            schema: createSuccessResponseSchema(organizationWithRelationsSchema),
          },
        },
      },
      400: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: validationErrorResponseSchema,
          },
        },
      },
      401: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      404: {
        description: 'Organization not found',
        content: {
          'application/json': {
            schema: notFoundErrorResponseSchema,
          },
        },
      },
      500: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
    },
  });

  /**
   * POST /api/organizations
   */
  registry.registerPath({
    method: 'post',
    path: '/api/organizations',
    operationId: 'postApiOrganizations',
    tags: ['Organizations'],
    summary: 'Create organization',
    description: 'Create a new organization',
    request: {
      body: {
        content: {
          'application/json': {
            schema: createOrganizationRequestSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Successfully created organization',
        content: {
          'application/json': {
            schema: createOrganizationResponseSchema,
          },
        },
      },
      400: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: validationErrorResponseSchema,
          },
        },
      },
      401: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      500: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
    },
  });

  /**
   * PATCH /api/organizations/:id
   */
  registry.registerPath({
    method: 'patch',
    path: '/api/organizations/{id}',
    operationId: 'patchApiOrganizationsById',
    tags: ['Organizations'],
    summary: 'Update organization',
    description: 'Update an existing organization',
    request: {
      params: organizationParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: updateOrganizationRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Successfully updated organization',
        content: {
          'application/json': {
            schema: updateOrganizationResponseSchema,
          },
        },
      },
      400: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: validationErrorResponseSchema,
          },
        },
      },
      401: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      404: {
        description: 'Organization not found',
        content: {
          'application/json': {
            schema: notFoundErrorResponseSchema,
          },
        },
      },
      500: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
    },
  });

  /**
   * POST /api/organizations/:id/picture
   */
  registry.registerPath({
    method: 'post',
    path: '/api/organizations/{id}/picture',
    operationId: 'postApiOrganizationsByIdPicture',
    tags: ['Organizations'],
    summary: 'Upload organization logo',
    description: `
Upload a logo for an organization. The organization's \`pictureUrl\` field is updated in the same request.

### File Format
- **Content Types**: \`image/jpeg\`, \`image/png\`, \`image/gif\`, \`image/webp\`
- **File Extensions**: \`.jpg\`, \`.jpeg\`, \`.png\`, \`.gif\`, \`.webp\`
- **Max Size**: 5MB (configurable via \`STORAGE_UPLOAD_MAX_FILE_SIZE\`)

### File Encoding
The file must be provided as a base64-encoded string (optional data URI prefix).
    `.trim(),
    request: {
      params: organizationParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: uploadOrganizationPictureRequestSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Picture uploaded successfully',
        content: {
          'application/json': {
            schema: uploadOrganizationPictureResponseSchema,
          },
        },
      },
      400: {
        description: 'Invalid request body or file validation failed',
        content: {
          'application/json': {
            schema: validationErrorResponseSchema,
          },
        },
      },
      401: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      403: {
        description: 'Forbidden',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
      404: {
        description: 'Organization not found',
        content: {
          'application/json': {
            schema: notFoundErrorResponseSchema,
          },
        },
      },
      500: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/organizations/{id}/picture/upload-url',
    operationId: 'postApiOrganizationsByIdPictureUploadUrl',
    tags: ['Organizations'],
    summary: 'Request a direct-upload URL for an organization logo',
    description: `
Ask for a URL to upload an organization logo **directly to storage**, without the
bytes passing through this API.

Content type, extension and size are validated **before** the URL is issued. The
URL commits to the exact \`contentLength\` and \`contentType\`, and to a path
derived from the organization id.

PUT the bytes to \`url\`, then call \`POST /api/organizations/{id}/picture/confirm\`.
Nothing is recorded against the organization until you do.
    `.trim(),
    request: {
      params: organizationParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: requestOrganizationPictureUploadUrlRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Upload URL issued',
        content: {
          'application/json': {
            schema: requestOrganizationPictureUploadUrlResponseSchema,
          },
        },
      },
      400: {
        description: 'Invalid content type, extension, size, or scope',
        content: {
          'application/json': {
            schema: validationErrorResponseSchema,
          },
        },
      },
      401: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      403: {
        description: 'Forbidden',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
      500: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/organizations/{id}/picture/confirm',
    operationId: 'postApiOrganizationsByIdPictureConfirm',
    tags: ['Organizations'],
    summary: 'Record a completed direct upload of an organization logo',
    description: `
Call this after the PUT from \`POST /api/organizations/{id}/picture/upload-url\` succeeds.

The object is read back from storage and checked against the upload policy before
anything is recorded. The storage path is re-derived from the organization id.
Confirm writes \`picture_path\`; the public \`pictureUrl\` is derived on read.
    `.trim(),
    request: {
      params: organizationParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: confirmOrganizationPictureUploadRequestSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Upload recorded; the organization pictureUrl now points at it',
        content: {
          'application/json': {
            schema: uploadOrganizationPictureResponseSchema,
          },
        },
      },
      400: {
        description: 'No uploaded file found, or it exceeds the size policy',
        content: {
          'application/json': {
            schema: validationErrorResponseSchema,
          },
        },
      },
      401: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      403: {
        description: 'Forbidden',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
      500: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
    },
  });

  /**
   * DELETE /api/organizations/:id
   */
  registry.registerPath({
    method: 'delete',
    path: '/api/organizations/{id}',
    operationId: 'deleteApiOrganizationsById',
    tags: ['Organizations'],
    summary: 'Delete organization',
    description:
      'Delete an organization (soft delete by default, use ?hardDelete=true for permanent deletion)',
    request: {
      params: organizationParamsSchema,
      query: deleteOrganizationQuerySchema,
    },
    responses: {
      200: {
        description: 'Successfully deleted organization',
        content: {
          'application/json': {
            schema: deleteOrganizationResponseSchema,
          },
        },
      },
      400: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: validationErrorResponseSchema,
          },
        },
      },
      401: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      404: {
        description: 'Organization not found',
        content: {
          'application/json': {
            schema: notFoundErrorResponseSchema,
          },
        },
      },
      500: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
    },
  });
  registry.registerPath({
    method: 'post',
    path: '/api/organizations/{id}/ownership-transfer',
    operationId: 'postApiOrganizationsByIdOwnershipTransfer',
    tags: ['Organizations'],
    summary: 'Transfer organization ownership',
    description: `
Moves the Organization Owner role to another member, in one transaction.

Requires \`Organization:TransferOwnership\` (held by the Owner role only) **and** that the caller is
a signed-in user who holds Owner in this organization right now. API keys and app tokens are refused.
Email verification and, when the organization enforces it or the caller has a factor, MFA are required.

Set exactly one of \`previousOwnerRoleId\` (the previous owner keeps that role: Admin, Dev or Viewer)
and \`leaveOrganization: true\` (the previous owner's membership is removed). The new owner must be a
current member, not the caller, not deactivated, and have a verified email. An organization always
has exactly one owner: the new owner is given Owner before the previous owner is changed.

Errors carry a stable \`reason\` in \`extensions\`: \`OWNERSHIP_TRANSFER_NOT_OWNER\`,
\`OWNERSHIP_TRANSFER_SESSION_REQUIRED\`, \`OWNERSHIP_TRANSFER_SELF\`,
\`OWNERSHIP_TRANSFER_INVALID_SELECTION\`, \`OWNERSHIP_TRANSFER_INVALID_ROLE\`,
\`OWNERSHIP_TRANSFER_TARGET_NOT_MEMBER\`, \`OWNERSHIP_TRANSFER_TARGET_DEACTIVATED\`,
\`OWNERSHIP_TRANSFER_TARGET_UNVERIFIED\`. Emits \`organization.ownership_transferred\`.
    `.trim(),
    request: {
      params: organizationParamsSchema,
      body: {
        content: {
          'application/json': {
            schema: transferOrganizationOwnershipRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Ownership transferred',
        content: {
          'application/json': {
            schema: transferOrganizationOwnershipResponseSchema,
          },
        },
      },
      400: {
        description: 'Validation error, invalid role selection, or the new owner is the caller',
        content: {
          'application/json': {
            schema: validationErrorResponseSchema,
          },
        },
      },
      401: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
      403: {
        description: 'Caller is not the current owner, or is not a signed-in user',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
      404: {
        description: 'The new owner is not a member of the organization',
        content: {
          'application/json': {
            schema: notFoundErrorResponseSchema,
          },
        },
      },
      409: {
        description: 'The new owner is deactivated or has no verified email',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
      500: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
    },
  });
}
