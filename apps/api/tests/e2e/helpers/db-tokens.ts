/**
 * DB helpers for E2E tests.
 *
 * Since the API runs inside a Docker container, we cannot read in-memory
 * adapters. Instead, we query the E2E Postgres directly to retrieve
 * verification tokens and invitation tokens that were generated during tests.
 *
 * Uses the `postgres` driver (same as the app) for a lightweight connection.
 */
import postgres from 'postgres';

let sql: ReturnType<typeof postgres> | null = null;

/** Get (or create) a postgres connection to the E2E database. */
function getConnection(): ReturnType<typeof postgres> {
  if (!sql) {
    const dbUrl =
      process.env.E2E_DB_URL ?? 'postgresql://grant_user:grant_password@localhost:5433/grant_e2e';
    sql = postgres(dbUrl, { max: 2, idle_timeout: 10 });
  }
  return sql;
}

/** Close the DB helper connection. Call in afterAll. */
export async function closeDbHelper(): Promise<void> {
  if (sql) {
    await sql.end();
    sql = null;
  }
}

// ---------------------------------------------------------------------------
// Verification tokens
// ---------------------------------------------------------------------------

interface OtpRow {
  provider_data: {
    otp?: { token?: string; validUntil?: number };
    [key: string]: unknown;
  };
}

/**
 * Retrieve the latest email verification OTP token for the given email.
 * Looks in `user_authentication_methods.provider_data -> otp -> token`.
 */
export async function getVerificationTokenForEmail(email: string): Promise<string | null> {
  const conn = getConnection();
  const rows = await conn<OtpRow[]>`
    SELECT provider_data
    FROM user_authentication_methods
    WHERE provider = 'email'
      AND provider_id = ${email}
      AND deleted_at IS NULL
    ORDER BY updated_at DESC
    LIMIT 1
  `;

  if (rows.length === 0) return null;

  const data = rows[0].provider_data;
  return data?.otp?.token ?? null;
}

// ---------------------------------------------------------------------------
// Organization invitation tokens
// ---------------------------------------------------------------------------

interface InvitationRow {
  token: string;
  status: string;
}

/**
 * Retrieve the latest pending invitation token for the given email and
 * organization.
 */
export async function getInvitationTokenForEmail(
  email: string,
  organizationId: string
): Promise<string | null> {
  const conn = getConnection();
  const rows = await conn<InvitationRow[]>`
    SELECT token, status
    FROM organization_invitations
    WHERE email = ${email}
      AND organization_id = ${organizationId}
      AND status = 'pending'
      AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (rows.length === 0) return null;
  return rows[0].token;
}

// ---------------------------------------------------------------------------
// Roles (for invitation – we need a valid roleId)
// ---------------------------------------------------------------------------

interface RoleRow {
  id: string;
  name: string;
}

/**
 * Get the first available role for an organization (used when inviting a member).
 * Roles are linked to organizations through the `organization_roles` join table.
 * Falls back to any role if no org-specific role exists.
 */
export async function getFirstRoleId(organizationId?: string): Promise<string | null> {
  const conn = getConnection();

  // Try org-specific roles via the organization_roles join table
  if (organizationId) {
    const orgRoles = await conn<RoleRow[]>`
      SELECT r.id, r.name
      FROM roles r
      INNER JOIN organization_roles orl ON orl.role_id = r.id
      WHERE orl.organization_id = ${organizationId}
        AND orl.deleted_at IS NULL
        AND r.deleted_at IS NULL
      ORDER BY r.created_at ASC
      LIMIT 1
    `;
    if (orgRoles.length > 0) return orgRoles[0].id;
  }

  // Fallback: any non-deleted role
  const roles = await conn<RoleRow[]>`
    SELECT id, name
    FROM roles
    WHERE deleted_at IS NULL
    ORDER BY created_at ASC
    LIMIT 1
  `;
  return roles.length > 0 ? roles[0].id : null;
}

/**
 * Get a non-owner organization role suitable for member invitations.
 *
 * The RBAC model prevents assigning a role of equal or higher privilege than
 * your own. Since org creators are Organization Owners, invitations must use
 * a lower-privilege role (Admin, Dev, or Viewer).
 *
 * Role names use i18n keys: `roles.names.organizationAdmin`, etc.
 * We exclude `roles.names.organizationOwner` and pick the first alternative.
 */
export async function getMemberRoleId(organizationId: string): Promise<string | null> {
  const conn = getConnection();

  const orgRoles = await conn<RoleRow[]>`
    SELECT r.id, r.name
    FROM roles r
    INNER JOIN organization_roles orl ON orl.role_id = r.id
    WHERE orl.organization_id = ${organizationId}
      AND orl.deleted_at IS NULL
      AND r.deleted_at IS NULL
      AND r.name != 'roles.names.organizationOwner'
    ORDER BY r.created_at ASC
    LIMIT 1
  `;

  return orgRoles.length > 0 ? orgRoles[0].id : null;
}

// ---------------------------------------------------------------------------
// Generic query helper
// ---------------------------------------------------------------------------

/**
 * Run an arbitrary read query against the E2E database.
 * Useful for ad-hoc assertions (e.g. "is the user verified?").
 */
export async function query<T extends Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T[]> {
  const conn = getConnection();
  // @ts-expect-error – postgres tagged template usage
  return conn<T[]>(strings, ...values);
}
