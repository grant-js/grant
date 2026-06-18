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

export async function setInvitationEmailProofTokenHash(
  token: string,
  emailProofTokenHash: string
): Promise<void> {
  const conn = getConnection();
  await conn`
    UPDATE organization_invitations
    SET email_verification_proof_token_hash = ${emailProofTokenHash},
        updated_at = NOW()
    WHERE token = ${token}
      AND deleted_at IS NULL
  `;
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

/**
 * Get an organization role ID by role name.
 * Role names are i18n keys stored in DB (from seed), e.g. 'roles.names.organizationOwner',
 * 'roles.names.organizationViewer', 'roles.names.organizationAdmin'.
 * Used in E2E to invite with a specific role or assert role-based access.
 */
export async function getOrganizationRoleIdByName(
  organizationId: string,
  roleName: string
): Promise<string | null> {
  const conn = getConnection();
  const rows = await conn<RoleRow[]>`
    SELECT r.id, r.name
    FROM roles r
    INNER JOIN organization_roles orl ON orl.role_id = r.id
    WHERE orl.organization_id = ${organizationId}
      AND orl.deleted_at IS NULL
      AND r.deleted_at IS NULL
      AND r.name = ${roleName}
    LIMIT 1
  `;
  return rows.length > 0 ? rows[0].id : null;
}

// ---------------------------------------------------------------------------
// Project users (for project OAuth E2E: user must be in project_users)
// ---------------------------------------------------------------------------

/**
 * Add a user to a project by inserting into project_users.
 * Used in project OAuth E2E so the callback can resolve scope and issue a token.
 * Uses WHERE NOT EXISTS because the table has a partial unique index (WHERE deleted_at IS NULL)
 * which cannot be referenced by ON CONFLICT (project_id, user_id).
 */
export async function addProjectUserForE2e(projectId: string, userId: string): Promise<void> {
  const conn = getConnection();
  await conn`
    INSERT INTO project_users (project_id, user_id)
    SELECT ${projectId}::uuid, ${userId}::uuid
    WHERE NOT EXISTS (
      SELECT 1 FROM project_users
      WHERE project_id = ${projectId}::uuid AND user_id = ${userId}::uuid AND deleted_at IS NULL
    )
  `;
}

// ---------------------------------------------------------------------------
// CDM replace-teardown E2E (pivot orphans, stagger uniqueness, tag lookup)
// ---------------------------------------------------------------------------

/** Live project-scoped tag id by display name (via project_tags). */
export async function getLiveTagIdByName(projectId: string, name: string): Promise<string | null> {
  const conn = getConnection();
  const rows = await conn<{ id: string }[]>`
    SELECT t.id
    FROM tags t
    INNER JOIN project_tags pt ON pt.tag_id = t.id AND pt.deleted_at IS NULL
    WHERE pt.project_id = ${projectId}::uuid
      AND t.name = ${name}
      AND t.deleted_at IS NULL
    LIMIT 1
  `;
  return rows.length > 0 ? rows[0].id : null;
}

/** Live project_app_tags pivots pointing at soft-deleted tags (orphan regression). */
export async function countOrphanProjectAppTags(projectId: string): Promise<number> {
  const conn = getConnection();
  const rows = await conn<{ count: string }[]>`
    SELECT COUNT(*)::text AS count
    FROM project_app_tags pat
    INNER JOIN project_apps pa ON pa.id = pat.project_app_id AND pa.deleted_at IS NULL
    INNER JOIN tags t ON t.id = pat.tag_id
    WHERE pa.project_id = ${projectId}::uuid
      AND pat.deleted_at IS NULL
      AND t.deleted_at IS NOT NULL
  `;
  return Number(rows[0]?.count ?? 0);
}

/** Live project_resources pivots pointing at soft-deleted resources. */
export async function countOrphanProjectResources(projectId: string): Promise<number> {
  const conn = getConnection();
  const rows = await conn<{ count: string }[]>`
    SELECT COUNT(*)::text AS count
    FROM project_resources pr
    INNER JOIN resources r ON r.id = pr.resource_id
    WHERE pr.project_id = ${projectId}::uuid
      AND pr.deleted_at IS NULL
      AND r.deleted_at IS NOT NULL
  `;
  return Number(rows[0]?.count ?? 0);
}

/**
 * Returns duplicate deleted_at values among tombstoned rows (violates *_deleted_at_idx).
 * Optionally scoped by project_id when the table has that column.
 */
export async function countDuplicateDeletedAtValues(
  tableName: 'project_resources' | 'user_groups' | 'project_user_groups',
  projectId?: string
): Promise<number> {
  const conn = getConnection();
  if (tableName === 'project_resources' && projectId) {
    const rows = await conn<{ count: string }[]>`
      SELECT COUNT(*)::text AS count
      FROM (
        SELECT deleted_at
        FROM project_resources
        WHERE project_id = ${projectId}::uuid AND deleted_at IS NOT NULL
        GROUP BY deleted_at
        HAVING COUNT(*) > 1
      ) dupes
    `;
    return Number(rows[0]?.count ?? 0);
  }
  if (tableName === 'user_groups') {
    const rows = await conn<{ count: string }[]>`
      SELECT COUNT(*)::text AS count
      FROM (
        SELECT deleted_at
        FROM user_groups
        WHERE deleted_at IS NOT NULL
        GROUP BY deleted_at
        HAVING COUNT(*) > 1
      ) dupes
    `;
    return Number(rows[0]?.count ?? 0);
  }
  if (tableName === 'project_user_groups' && projectId) {
    const rows = await conn<{ count: string }[]>`
      SELECT COUNT(*)::text AS count
      FROM (
        SELECT deleted_at
        FROM project_user_groups
        WHERE project_id = ${projectId}::uuid AND deleted_at IS NOT NULL
        GROUP BY deleted_at
        HAVING COUNT(*) > 1
      ) dupes
    `;
    return Number(rows[0]?.count ?? 0);
  }
  return 0;
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
