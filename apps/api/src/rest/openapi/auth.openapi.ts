import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import { z } from '@/lib/zod-openapi.lib';
import {
  authenticationErrorResponseSchema,
  cliCallbackRequestSchema,
  cliCallbackResultSchema,
  errorResponseSchema,
  isAuthorizedRequestSchema,
  isAuthorizedResponseSchema,
  loginRequestSchema,
  loginResultSchema,
  logoutRequestSchema,
  logoutResponseSchema,
  refreshSessionResponseSchema,
  registerRequestSchema,
  registerResponseSchema,
  requestPasswordResetRequestSchema,
  requestPasswordResetResponseSchema,
  resendVerificationRequestSchema,
  resendVerificationResponseSchema,
  resetPasswordRequestSchema,
  resetPasswordResponseSchema,
  projectAppInfoQuerySchema,
  projectAppInfoResponseSchema,
  projectConsentApproveBodySchema,
  projectConsentDenyBodySchema,
  projectConsentInfoQuerySchema,
  projectConsentInfoResponseSchema,
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
   * Refresh session using refresh token from HttpOnly cookie (no request body).
   */
  registry.registerPath({
    method: 'post',
    path: '/api/auth/refresh',
    tags: ['Authentication'],
    summary: 'Refresh session',
    description:
      'Refresh access token using the refresh token sent in an HttpOnly cookie. No request body. Responds with new accessToken; refresh cookie is rotated on success.',
    responses: {
      200: {
        description: 'Successfully refreshed tokens',
        content: {
          'application/json': {
            schema: refreshSessionResponseSchema,
          },
        },
      },
      401: {
        description: 'Invalid or expired refresh token (or no cookie)',
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
- \`state\` (required): OAuth state validation token
- \`error\` (optional): Error code from GitHub if authorization was denied
- \`error_description\` (optional): Error description from GitHub

### Flow Types

#### Login/Register Flow
1. Validates the state token
2. Exchanges authorization code for access token
3. Fetches user information from GitHub
4. Checks for existing user by GitHub ID or email
5. If user exists: logs in and links GitHub auth if needed
6. If user doesn't exist: creates new account and user
7. Redirects to frontend \`/auth/callback\` with access and refresh tokens in the URL fragment (and \`next\` for destination); frontend stores tokens and redirects to destination

#### Connect Flow (action=connect)
1. Validates the state token
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
          description: 'OAuth state validation token',
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
   * GET /api/auth/project/authorize
   * Initiate project-scoped OAuth (e.g. GitHub) for a project app
   */
  registry.registerPath({
    method: 'get',
    path: '/api/auth/project/authorize',
    tags: ['Authentication'],
    summary: 'Initiate project OAuth',
    description: `
Initiate the project-scoped OAuth flow. Used by project applications (ProjectApp) to let end users sign in with a provider (e.g. GitHub) and receive a JWT scoped to that project.

The user is redirected to the provider; after authorization, the provider redirects to \`/api/auth/project/callback\` with an authorization code.

### Query Parameters
- \`client_id\` (required): The project app client ID (from ProjectApp).
- \`redirect_uri\` (required): URL to redirect to after successful authentication. Must be registered in the project app's redirect URIs.
- \`state\` (optional): Opaque value echoed back in the callback for CSRF protection.
- \`scope\` (optional): Space-delimited scopes to request; must be a subset of the app's configured scopes. If omitted, all app scopes are used.
- \`provider\` (optional): Auth provider (e.g. \`github\`, \`email\`). Default: \`github\`.
- \`locale\` (optional): Frontend locale for the consent redirect (e.g. \`en\`, \`de\`). When provided, the callback redirects to \`/{locale}/auth/project/consent\`.

### Flow
1. Validates client_id and redirect_uri against the project app.
2. Stores state in cache and redirects to the provider (e.g. GitHub).
3. User authorizes; provider redirects to \`/api/auth/project/callback\` with code and state.
4. Callback exchanges code, resolves/creates user, checks project membership, issues project-scoped JWT, redirects to \`redirect_uri\` with token in fragment.
    `.trim(),
    request: {
      query: z.object({
        client_id: z.string().min(1).openapi({
          description: 'Project app client ID',
          example: '550e8400-e29b-41d4-a716-446655440000',
        }),
        redirect_uri: z.string().url().openapi({
          description: 'Redirect URI (must be in project app allowlist)',
          example: 'https://myapp.example.com/callback',
        }),
        state: z.string().optional().openapi({
          description: 'Opaque state for CSRF protection',
          example: 'random-state-token',
        }),
        scope: z.string().optional().openapi({
          description: 'Space-delimited scopes (subset of app-configured scopes)',
          example: 'organization:read user:read',
        }),
        provider: z.enum(['github', 'email']).optional().openapi({
          description: 'Auth provider',
          default: 'github',
        }),
        locale: z.string().min(1).optional().openapi({
          description: 'Frontend locale for consent redirect (e.g. en, de)',
          example: 'en',
        }),
      }),
    },
    responses: {
      302: {
        description: 'Redirect to provider authorization page',
      },
      400: {
        description: 'Invalid client_id, redirect_uri, or validation error',
        content: {
          'application/json': {
            schema: validationErrorResponseSchema,
          },
        },
      },
    },
  });

  /**
   * POST /api/auth/project/email/request
   * Request a project OAuth magic link (email provider)
   */
  registry.registerPath({
    method: 'post',
    path: '/api/auth/project/email/request',
    tags: ['Authentication'],
    summary: 'Request project OAuth magic link',
    description: `
Request a magic link for project-scoped sign-in via email. Used when the project app uses \`provider=email\` and the user has been redirected to the email entry page (with client_id, redirect_uri, state from the authorize step).

Sends an email containing a one-time link to \`/api/auth/project/callback?token=...&state=...\`. When the user clicks the link, the callback resolves the user by email, checks project membership, and issues a project-scoped JWT.

### Request body
- \`client_id\` (required): Project app client ID.
- \`redirect_uri\` (required): Must match the value used in the authorize step and be in the app's allowlist.
- \`state\` (required): State from the authorize step (echoed back in the callback).
- \`email\` (required): User's email address.
- \`client_state\` (optional): Optional opaque value to pass through to the app in the callback fragment.
- \`scope\` (optional): Space-delimited scopes to request (subset of app-configured scopes). If omitted, all app scopes are used.
- \`locale\` (optional): Frontend locale for consent redirect and magic-link email content (e.g. \`en\`, \`de\`).
    `.trim(),
    request: {
      body: {
        content: {
          'application/json': {
            schema: z.object({
              client_id: z.string().min(1),
              redirect_uri: z.string().url(),
              state: z.string().min(1),
              email: z.string().email(),
              client_state: z.string().optional(),
              scope: z.string().optional(),
              locale: z.string().min(1).optional(),
            }),
          },
        },
      },
    },
    responses: {
      202: {
        description: 'Magic link email sent (or accepted; no body for security)',
      },
      400: {
        description: 'Invalid client_id, redirect_uri, or email',
        content: {
          'application/json': {
            schema: validationErrorResponseSchema,
          },
        },
      },
    },
  });

  /**
   * GET /api/auth/project/callback
   * Handle project-scoped OAuth callback (GitHub code or email magic-link token)
   */
  registry.registerPath({
    method: 'get',
    path: '/api/auth/project/callback',
    tags: ['Authentication'],
    summary: 'Project OAuth callback',
    description: `
Handle the callback for project-scoped OAuth. Supports two flows:

**GitHub:** \`code\` and \`state\` from the provider. Exchanges code, resolves/creates user by GitHub, verifies project membership, issues JWT.

**Email:** \`token\` and \`state\` from the magic link. Validates one-time token, resolves/creates user by email, verifies project membership, issues JWT.

After authentication, redirects to the consent page (\`PROJECT_OAUTH_CONSENT_URL\`) with \`consent_token\` in query. The user approves or denies; then the frontend calls consent/approve or consent/deny to complete the flow.

### Query Parameters (GitHub flow)
- \`code\` (required when GitHub): Authorization code from the provider.
- \`state\` (required): State from the authorize step.

### Query Parameters (Email flow)
- \`token\` (required when email): One-time token from the magic link.
- \`state\` (required): State from the authorize step.
    `.trim(),
    request: {
      query: z.object({
        code: z.string().optional().openapi({
          description: 'Authorization code from the provider (GitHub flow)',
        }),
        token: z.string().optional().openapi({
          description: 'One-time token from magic link (email flow)',
        }),
        state: z.string().min(1).openapi({
          description: 'State from the authorize step',
          example: 'random-state-token',
        }),
      }),
    },
    responses: {
      302: {
        description: 'Redirect to consent page with consent_token, or to app redirect_uri on error',
      },
      400: {
        description: 'Invalid state, code, or validation error',
        content: {
          'application/json': {
            schema: validationErrorResponseSchema,
          },
        },
      },
      401: {
        description: 'User not in project or OAuth failed',
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
   * GET /api/auth/project/app-info
   * Public project app info for OAuth entry/consent UI
   */
  registry.registerPath({
    method: 'get',
    path: '/api/auth/project/app-info',
    tags: ['Authentication'],
    summary: 'Project app public info',
    description:
      'Returns app name, enabled providers, and scopes with name/description for the OAuth entry or consent UI. If query param `scope` is provided (space-delimited), returned scopes are the intersection with the app-configured scopes. No authentication required.',
    request: {
      query: projectAppInfoQuerySchema,
    },
    responses: {
      200: {
        description: 'App info',
        content: {
          'application/json': {
            schema: z.object({
              success: z.literal(true),
              data: projectAppInfoResponseSchema,
            }),
          },
        },
      },
      404: {
        description: 'Project app not found',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
    },
  });

  /**
   * GET /api/auth/project/consent-info
   * Consent page: app name, scopes, and current user display for the consent_token
   */
  registry.registerPath({
    method: 'get',
    path: '/api/auth/project/consent-info',
    tags: ['Authentication'],
    summary: 'Consent info',
    description:
      'Returns app name, scopes (with labels), and current user display (name, email, pictureUrl) for the consent page. Validates consent_token but does not consume it.',
    request: {
      query: projectConsentInfoQuerySchema,
    },
    responses: {
      200: {
        description: 'Consent info',
        content: {
          'application/json': {
            schema: z.object({
              success: z.literal(true),
              data: projectConsentInfoResponseSchema,
            }),
          },
        },
      },
      401: {
        description: 'Invalid or expired consent token',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
    },
  });

  /**
   * POST /api/auth/project/consent/approve
   * Approve consent and get redirect URL with token
   */
  registry.registerPath({
    method: 'post',
    path: '/api/auth/project/consent/approve',
    tags: ['Authentication'],
    summary: 'Approve consent',
    description:
      'Consumes the consent token, issues the project-scoped JWT, and returns the redirect URL to the app with access_token in fragment.',
    request: {
      body: {
        content: {
          'application/json': {
            schema: projectConsentApproveBodySchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Redirect URL to app with token in fragment',
        content: {
          'application/json': {
            schema: z.object({
              success: z.literal(true),
              data: z.object({ redirectUrl: z.string().url() }),
            }),
          },
        },
      },
      401: {
        description: 'Invalid or expired consent token',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
          },
        },
      },
    },
  });

  /**
   * POST /api/auth/project/consent/deny
   * Deny consent and get redirect URL with error
   */
  registry.registerPath({
    method: 'post',
    path: '/api/auth/project/consent/deny',
    tags: ['Authentication'],
    summary: 'Deny consent',
    description:
      'Consumes the consent token and returns the redirect URL to the app with error=access_denied in fragment.',
    request: {
      body: {
        content: {
          'application/json': {
            schema: projectConsentDenyBodySchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Redirect URL to app with error in fragment',
        content: {
          'application/json': {
            schema: z.object({
              success: z.literal(true),
              data: z.object({ redirectUrl: z.string().url() }),
            }),
          },
        },
      },
      401: {
        description: 'Invalid or expired consent token',
        content: {
          'application/json': {
            schema: authenticationErrorResponseSchema,
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

  // POST /api/auth/cli-callback — Exchange CLI one-time code for session tokens
  registry.registerPath({
    method: 'post',
    path: '/api/auth/cli-callback',
    tags: ['Authentication'],
    summary: 'Exchange CLI one-time code for session tokens',
    description:
      'Used by the Grant CLI after a GitHub OAuth redirect to localhost. ' +
      'Exchanges the one-time code for access and refresh tokens. ' +
      'The code is single-use and short-lived (60 seconds).',
    security: [],
    request: {
      body: {
        content: {
          'application/json': {
            schema: cliCallbackRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Tokens and accounts returned',
        content: {
          'application/json': {
            schema: z.object({
              success: z.literal(true),
              data: cliCallbackResultSchema,
            }),
          },
        },
      },
      400: {
        description: 'Invalid or expired code',
        content: {
          'application/json': {
            schema: errorResponseSchema,
          },
        },
      },
    },
  });
}
