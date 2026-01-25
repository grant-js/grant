import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import { z } from '@/lib/zod-openapi.lib';
import {
  authenticationErrorResponseSchema,
  errorResponseSchema,
  isAuthorizedRequestSchema,
  isAuthorizedResponseSchema,
  loginRequestSchema,
  loginResultSchema,
  logoutRequestSchema,
  logoutResponseSchema,
  refreshSessionRequestSchema,
  refreshSessionResponseSchema,
  registerRequestSchema,
  registerResponseSchema,
  requestPasswordResetRequestSchema,
  requestPasswordResetResponseSchema,
  resendVerificationRequestSchema,
  resendVerificationResponseSchema,
  resetPasswordRequestSchema,
  resetPasswordResponseSchema,
  validationErrorResponseSchema,
  verifyEmailRequestSchema,
  verifyEmailResponseSchema,
} from '@/rest/schemas';
/**
 * Register authentication endpoints in the OpenAPI registry
 */
export function registerAuthEndpoints(registry: OpenAPIRegistry) {
  /**
   * POST /api/auth/login
   * Authenticate a user with provider credentials
   */
  registry.registerPath({
    method: 'post',
    path: '/api/auth/login',
    tags: ['Authentication'],
    summary: 'Login user',
    description:
      'Authenticate a user using provider credentials (email, Google, GitHub, Microsoft)',
    request: {
      body: {
        content: {
          'application/json': {
            schema: loginRequestSchema,
            example: {
              provider: 'email',
              providerId: 'user@example.com',
              providerData: { password: 'password123' },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Successfully authenticated',
        content: {
          'application/json': {
            schema: z.object({
              success: z.literal(true),
              data: loginResultSchema,
            }),
            example: {
              success: true,
              data: {
                account: {
                  id: 'acc_123',
                  type: 'personal',
                  ownerId: 'usr_456',
                  createdAt: '2025-10-11T00:00:00Z',
                  updatedAt: '2025-10-11T00:00:00Z',
                  deletedAt: null,
                },
                accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              },
            },
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
        description: 'Authentication failed',
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
   * POST /api/auth/register
   * Register a new user account
   */
  registry.registerPath({
    method: 'post',
    path: '/api/auth/register',
    tags: ['Authentication'],
    summary: 'Register new user',
    description: 'Create a new user account with provider authentication',
    request: {
      body: {
        content: {
          'application/json': {
            schema: registerRequestSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Successfully registered',
        content: {
          'application/json': {
            schema: registerResponseSchema,
          },
        },
      },
      400: {
        description: 'Validation error or registration failed',
        content: {
          'application/json': {
            schema: validationErrorResponseSchema,
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
   * POST /api/auth/refresh
   * Refresh authentication tokens
   */
  registry.registerPath({
    method: 'post',
    path: '/api/auth/refresh',
    tags: ['Authentication'],
    summary: 'Refresh session',
    description: 'Refresh access and refresh tokens for an authenticated session',
    request: {
      body: {
        content: {
          'application/json': {
            schema: refreshSessionRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Successfully refreshed tokens',
        content: {
          'application/json': {
            schema: refreshSessionResponseSchema,
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
        description: 'Invalid or expired tokens',
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
   * POST /api/auth/logout
   * Logout user and invalidate session
   */
  registry.registerPath({
    method: 'post',
    path: '/api/auth/logout',
    tags: ['Authentication'],
    summary: 'Logout user',
    description: 'Logout the current user and invalidate their session',
    request: {
      body: {
        content: {
          'application/json': {
            schema: logoutRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Successfully logged out',
        content: {
          'application/json': {
            schema: logoutResponseSchema,
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
   * POST /api/auth/request-password-reset
   * Request a password reset email
   */
  registry.registerPath({
    method: 'post',
    path: '/api/auth/request-password-reset',
    tags: ['Authentication'],
    summary: 'Request password reset',
    description: 'Request a password reset email to be sent to the specified email address',
    request: {
      body: {
        content: {
          'application/json': {
            schema: requestPasswordResetRequestSchema,
            example: {
              email: 'user@example.com',
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Password reset email sent successfully',
        content: {
          'application/json': {
            schema: requestPasswordResetResponseSchema,
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
   * POST /api/auth/reset-password
   * Reset password using token from email
   */
  registry.registerPath({
    method: 'post',
    path: '/api/auth/reset-password',
    tags: ['Authentication'],
    summary: 'Reset password',
    description: 'Reset the password for an account using a token received via email',
    request: {
      body: {
        content: {
          'application/json': {
            schema: resetPasswordRequestSchema,
            example: {
              token: 'abc123def456...',
              newPassword: 'NewSecurePassword123!',
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Password reset successfully',
        content: {
          'application/json': {
            schema: resetPasswordResponseSchema,
          },
        },
      },
      400: {
        description: 'Validation error or invalid/expired token',
        content: {
          'application/json': {
            schema: validationErrorResponseSchema,
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
   * POST /api/auth/verify-email
   * Verify email address using token
   */
  registry.registerPath({
    method: 'post',
    path: '/api/auth/verify-email',
    tags: ['Authentication'],
    summary: 'Verify email address',
    description: 'Verify an email address using a verification token received via email',
    request: {
      body: {
        content: {
          'application/json': {
            schema: verifyEmailRequestSchema,
            example: {
              token: 'abc123def456...',
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Email verified successfully',
        content: {
          'application/json': {
            schema: verifyEmailResponseSchema,
          },
        },
      },
      400: {
        description: 'Validation error or invalid/expired token',
        content: {
          'application/json': {
            schema: validationErrorResponseSchema,
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
   * POST /api/auth/resend-verification
   * Resend email verification
   */
  registry.registerPath({
    method: 'post',
    path: '/api/auth/resend-verification',
    tags: ['Authentication'],
    summary: 'Resend verification email',
    description: 'Resend a verification email to the specified email address',
    request: {
      body: {
        content: {
          'application/json': {
            schema: resendVerificationRequestSchema,
            example: {
              email: 'user@example.com',
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Verification email sent successfully',
        content: {
          'application/json': {
            schema: resendVerificationResponseSchema,
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
   * GET /api/auth/github
   * Initiate GitHub OAuth flow
   */
  registry.registerPath({
    method: 'get',
    path: '/api/auth/github',
    tags: ['Authentication'],
    summary: 'Initiate GitHub OAuth',
    description: `
Initiate the GitHub OAuth authentication flow.

This endpoint redirects the user to GitHub's authorization page. After authorization,
GitHub will redirect back to \`/api/auth/github/callback\` with an authorization code.

### Query Parameters
- \`redirect\` (optional): URL to redirect to after successful authentication. Must be from the same origin as the frontend URL.
- \`accountType\` (optional): Account type to create if registering a new user. Must be \`personal\` or \`organization\`. Defaults to \`personal\`.
- \`action\` (optional): OAuth action type. Must be \`login\`, \`register\`, or \`connect\`. Defaults to \`login\`.
  - \`login\`: Standard login flow (default)
  - \`register\`: Registration flow for new users
  - \`connect\`: Connect GitHub to existing authenticated user account (requires authentication)

### Connect Flow
When \`action=connect\`, the user must be authenticated. This flow allows an existing user
to link their GitHub account to their current account from the settings page. The authenticated
user's ID is automatically used, and the redirect URL defaults to the security settings page.

### Standard Flow
1. User is redirected to GitHub authorization page
2. User authorizes the application
3. GitHub redirects to \`/api/auth/github/callback\` with authorization code
4. Backend exchanges code for access token and user info
5. User is logged in or registered, then redirected to the frontend
    `.trim(),
    request: {
      query: z.object({
        redirect: z.string().url().optional().openapi({
          description: 'URL to redirect to after successful authentication',
          example: 'http://localhost:3000/en/dashboard',
        }),
        accountType: z.enum(['personal', 'organization']).optional().openapi({
          description: 'Account type to create if registering a new user',
          example: 'personal',
        }),
        action: z.enum(['login', 'register', 'connect']).optional().openapi({
          description:
            'OAuth action type. Use "connect" to link GitHub to existing authenticated user account',
          example: 'login',
        }),
      }),
    },
    responses: {
      302: {
        description: 'Redirect to GitHub authorization page',
      },
      400: {
        description: 'Invalid redirect URL',
        content: {
          'application/json': {
            schema: validationErrorResponseSchema,
          },
        },
      },
    },
  });

  /**
   * GET /api/auth/github/callback
   * Handle GitHub OAuth callback
   */
  registry.registerPath({
    method: 'get',
    path: '/api/auth/github/callback',
    tags: ['Authentication'],
    summary: 'GitHub OAuth callback',
    description: `
Handle the callback from GitHub OAuth flow.

This endpoint is called by GitHub after the user authorizes the application.
It exchanges the authorization code for an access token, fetches user information,
and either logs in an existing user or creates a new account.

### Query Parameters
- \`code\` (required): Authorization code from GitHub
- \`state\` (required): CSRF protection token
- \`error\` (optional): Error code from GitHub if authorization was denied
- \`error_description\` (optional): Error description from GitHub

### Flow Types

#### Login/Register Flow
1. Validates the state token (CSRF protection)
2. Exchanges authorization code for access token
3. Fetches user information from GitHub
4. Checks for existing user by GitHub ID or email
5. If user exists: logs in and links GitHub auth if needed
6. If user doesn't exist: creates new account and user
7. Sets authentication cookies and redirects to frontend

#### Connect Flow (action=connect)
1. Validates the state token (CSRF protection)
2. Exchanges authorization code for access token
3. Fetches user information from GitHub
4. Links GitHub authentication method to the authenticated user's account
5. Validates that the GitHub account is not already connected to another user
6. Redirects back to settings page with success/error indicators in query parameters
7. On success: redirects with \`?connected=github&success=true\`
8. On error: redirects with \`?connected=github&error=<error_message>\`

### Error Handling
- If GitHub returns an error, redirects to login page with error parameter
- If provider is already connected to another user, returns error in redirect URL
- If validation fails, returns appropriate error response
    `.trim(),
    request: {
      query: z.object({
        code: z.string().optional().openapi({
          description: 'Authorization code from GitHub',
          example: 'abc123def456...',
        }),
        state: z.string().optional().openapi({
          description: 'CSRF protection token',
          example: 'random-state-token',
        }),
        error: z.string().optional().openapi({
          description: 'Error code from GitHub if authorization was denied',
          example: 'access_denied',
        }),
        error_description: z.string().optional().openapi({
          description: 'Error description from GitHub',
          example: 'The user denied the request',
        }),
      }),
    },
    responses: {
      302: {
        description: 'Redirect to frontend with authentication result',
      },
      400: {
        description: 'Invalid state token or missing parameters',
        content: {
          'application/json': {
            schema: validationErrorResponseSchema,
          },
        },
      },
      401: {
        description: 'OAuth flow failed or user denied authorization',
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
   * POST /api/auth/is-authorized
   * Check if user is authorized to perform an action
   */
  registry.registerPath({
    method: 'post',
    path: '/api/auth/is-authorized',
    tags: ['Authentication'],
    summary: 'Check if user is authorized',
    description: `
Check if a user is authorized to perform an action on a resource within a scope.

This endpoint evaluates permissions following the cascade:
User → Role → Group → Permission → Resource

### Authorization Flow
1. Gets user roles in the specified scope
2. Gets groups for those roles
3. Gets permissions for those groups
4. Matches permissions against the resource and action
5. Evaluates any conditions associated with matched permissions

### Execution Context
You can provide additional context to help with condition evaluation:
- \`resource\`: Resource-specific data
    `.trim(),
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        content: {
          'application/json': {
            schema: isAuthorizedRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Authorization check completed',
        content: {
          'application/json': {
            schema: isAuthorizedResponseSchema,
          },
        },
      },
      400: {
        description: 'Invalid request parameters',
        content: {
          'application/json': {
            schema: validationErrorResponseSchema,
          },
        },
      },
      401: {
        description: 'Unauthorized - Authentication required',
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
}
