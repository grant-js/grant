/**
 * E2E: a CDM import never renames a user; the document's name is the project's display name.
 *
 * The global `users.name` belongs to the person. An import seeds it only when it creates the
 * user. A later import that lists the same person under another name changes this project's
 * `project_users.display_name` and nothing else: not for an account that signed up before the
 * import, not for an identity the import created and the person then claimed, and not for a
 * keyed user nobody has claimed yet (they may be invited later and would see the name on
 * their first sign-in).
 *
 * Social sign-in runs against the stub IdP in `tests/e2e/stub-idp` (docker-compose.e2e.yml).
 *
 * Prerequisites: E2E stack with JOBS_ENABLED=true and JOB_PROVIDER=node-cron. All addresses
 * and names are synthetic.
 */
import { CdmFindBy, ProjectSyncJobStatus } from '@grantjs/schema';
import { afterAll, describe, expect, it } from 'vitest';

import type { CdmDocumentInput } from '@/lib/cdm/cdm-document.schemas';

import { cdmWithRoleTemplate } from '../../helpers/cdm-sync-fixtures';
import { apiClient } from '../helpers/api-client';
import { closeDbHelper, query } from '../helpers/db-tokens';
import { postImport, resolveJob, scopeForAccountProject } from '../helpers/sync-job';
import { TestUser } from '../helpers/test-user';

let counter = 0;
function uid(): string {
  return `${Date.now()}-${++counter}`;
}

type Names = Record<string, unknown> & {
  user_id: string;
  global_name: string;
  display_name: string | null;
};

/** The one member of `projectId`: their global name and this project's display name. */
async function namesIn(projectId: string): Promise<Names> {
  const rows = await query<Names>`
    SELECT u.id::text AS user_id, u.name AS global_name, pu.display_name
    FROM project_users pu
    JOIN users u ON u.id = pu.user_id
    WHERE pu.project_id = ${projectId}::uuid AND pu.deleted_at IS NULL
  `;
  expect(rows).toHaveLength(1);
  return rows[0]!;
}

/** A project of `owner`'s account and a function that imports one user into it by name. */
async function projectImportingOneUser(owner: TestUser, key: { value: string; findBy: CdmFindBy }) {
  const projectRes = await apiClient()
    .post('/api/projects')
    .set('Authorization', owner.authHeader)
    .send({ name: `E2E Names ${uid()}`, scope: { id: owner.accountId, tenant: 'account' } })
    .expect(201);
  const projectId = projectRes.body.data.id as string;
  const scope = scopeForAccountProject(owner.accountId, projectId);
  const roleKey = `names-${uid()}`;

  const importAs = async (name: string) => {
    const cdm: CdmDocumentInput = cdmWithRoleTemplate(roleKey, {
      users: [
        {
          key,
          name,
          roles: [roleKey],
          groups: [],
          permissions: [],
          tags: [],
          primaryTag: null,
          apiKeys: [],
          metadata: null,
        },
      ],
    });
    const imported = await postImport(owner.authHeader, projectId, scope, cdm);
    expect(imported.status).toBe(202);
    const done = await resolveJob(
      owner.authHeader,
      projectId,
      scope,
      imported.job,
      ProjectSyncJobStatus.Completed
    );
    return done.result;
  };

  return { projectId, importAs };
}

/** Console Google sign-in against the stub IdP; true when it signed the person in. */
async function googleSignIn(email: string): Promise<boolean> {
  const start = await apiClient().get('/api/auth/google').redirects(0).expect(302);
  const state = new URL(start.headers.location as string).searchParams.get('state');
  expect(state).toBeTruthy();
  const profile = { sub: `e2e-google-${uid()}`, email, email_verified: true };
  const code = Buffer.from(JSON.stringify(profile)).toString('base64url');
  const callback = await apiClient()
    .get('/api/auth/google/callback')
    .query({ code, state })
    .redirects(0)
    .expect(302);
  const location = callback.headers.location as string;
  const cookies = ([] as string[]).concat(callback.headers['set-cookie'] ?? []);
  return !location.includes('error=') && cookies.some((c) => /refresh/i.test(c));
}

afterAll(async () => {
  await closeDbHelper();
});

describe('Project sync keeps the global user name', () => {
  it('an account that signed up before the import keeps its name; the project shows the document name', async () => {
    const owner = await TestUser.create();
    const member = await TestUser.create();
    const [account] = await query<{ user_id: string; name: string }>`
      SELECT u.id::text AS user_id, u.name
      FROM user_authentication_methods m JOIN users u ON u.id = m.user_id
      WHERE m.provider = 'email' AND m.provider_id = ${member.email} AND m.deleted_at IS NULL
    `;
    expect(account).toBeDefined();
    const { projectId, importAs } = await projectImportingOneUser(owner, {
      value: member.email,
      findBy: CdmFindBy.Email,
    });

    const first = await importAs('Project Name One');
    expect(first).toMatchObject({ usersCreated: 0, usersRenamed: 0 });
    expect(await namesIn(projectId)).toEqual({
      user_id: account!.user_id,
      global_name: account!.name,
      display_name: 'Project Name One',
    });

    const second = await importAs('Project Name Two');
    expect(second).toMatchObject({ usersRenamed: 0, projectDisplayNamesUpdated: 1 });
    expect(await namesIn(projectId)).toEqual({
      user_id: account!.user_id,
      global_name: account!.name,
      display_name: 'Project Name Two',
    });

    // The account and its sign-in method are untouched.
    const login = await apiClient()
      .post('/api/auth/login')
      .send({
        provider: 'email',
        providerId: member.email,
        providerData: { password: member.password },
      });
    expect(login.status).toBe(200);
  });

  it('an identity the import created and the person claimed keeps its name on later imports', async () => {
    const owner = await TestUser.create();
    const email = `e2e-names-claimed-${uid()}@gmail.com`;
    const { projectId, importAs } = await projectImportingOneUser(owner, {
      value: email,
      findBy: CdmFindBy.Email,
    });

    const created = await importAs('Imported Person');
    expect(created).toMatchObject({ usersCreated: 1 });
    const before = await namesIn(projectId);
    expect(before.global_name).toBe('Imported Person');

    // The person claims the identity: verified Email method plus a Google method.
    expect(await googleSignIn(email)).toBe(true);
    const providers = await query<{ provider: string }>`
      SELECT provider FROM user_authentication_methods
      WHERE user_id = ${before.user_id}::uuid AND deleted_at IS NULL ORDER BY provider
    `;
    expect(providers.map((p) => p.provider)).toEqual(['email', 'google']);

    const later = await importAs('Renamed At Source');
    expect(later).toMatchObject({ usersCreated: 0, usersRenamed: 0 });
    expect(await namesIn(projectId)).toEqual({
      user_id: before.user_id,
      global_name: 'Imported Person',
      display_name: 'Renamed At Source',
    });
  });

  it('a keyed user the import created is seeded once and never renamed', async () => {
    const owner = await TestUser.create();
    const { projectId, importAs } = await projectImportingOneUser(owner, {
      value: `legacy-${uid()}`,
      findBy: CdmFindBy.Key,
    });

    const created = await importAs('  Seeded Name ');
    expect(created).toMatchObject({ usersCreated: 1, usersRenamed: 0 });
    const before = await namesIn(projectId);
    expect(before).toMatchObject({ global_name: 'Seeded Name', display_name: 'Seeded Name' });

    const later = await importAs('Renamed At Source');
    expect(later).toMatchObject({ usersCreated: 0, usersRenamed: 0 });
    expect(await namesIn(projectId)).toEqual({
      user_id: before.user_id,
      global_name: 'Seeded Name',
      display_name: 'Renamed At Source',
    });
  });
});
