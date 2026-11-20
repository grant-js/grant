/**
 * E2E: a CDM import never writes the document's name to the global user; it is the project's
 * display name. A claim gives the person the name a first-time sign-up would get.
 *
 * The global `users.name` belongs to the person. A user the import creates gets the name a
 * first-time sign-up would (the address before `@`, else `User`), and a later import that
 * lists the same person under another name changes this project's
 * `project_users.display_name` and nothing else: not for an account that signed up before the
 * import, not for an identity the import created and the person then claimed, and not for a
 * keyed user nobody has claimed yet (they may be invited later and would see the name on
 * their first sign-in). Claiming the identity gives it the provider's profile name (Google,
 * GitHub) or the e-mail sign-up name (invitation register). The export gives back the
 * document's name (the project display name), so an import and an export round-trip.
 *
 * Social sign-in runs against the stub IdP in `tests/e2e/stub-idp` (docker-compose.e2e.yml).
 *
 * Prerequisites: E2E stack with JOBS_ENABLED=true and JOB_PROVIDER=node-cron. All addresses
 * and names are synthetic.
 */
import { CdmFindBy, ProjectSyncJobStatus } from '@grantjs/schema';
import { hashSync } from 'bcrypt';
import { afterAll, describe, expect, it } from 'vitest';

import type { CdmDocumentInput } from '@/lib/cdm/cdm-document.schemas';

import { cdmWithRoleTemplate, exportInput } from '../../helpers/cdm-sync-fixtures';
import { apiClient } from '../helpers/api-client';
import {
  closeDbHelper,
  getInvitationTokenForEmail,
  query,
  setInvitationEmailProofTokenHash,
} from '../helpers/db-tokens';
import {
  downloadSnapshot,
  postExport,
  postImport,
  resolveJob,
  scopeForAccountProject,
} from '../helpers/sync-job';
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

  /**
   * The name an export gives back for the user the import created: its provisioned entry
   * (`metadata.grantUserId`). The assignment entry of the same user carries the key as its
   * name, as it always has, and is not what this checks.
   */
  const exportedNameOf = async (userId: string) => {
    const exported = await postExport(owner.authHeader, projectId, scope, exportInput());
    expect(exported.status).toBe(202);
    const done = await resolveJob(
      owner.authHeader,
      projectId,
      scope,
      exported.job,
      ProjectSyncJobStatus.Completed
    );
    const snap = await downloadSnapshot(owner.authHeader, projectId, done.id, scope);
    expect(snap.status).toBe(200);
    const provisioned = (snap.snapshot.users ?? []).filter(
      (u) => (u.metadata as Record<string, unknown> | null)?.grantUserId === userId
    );
    expect(provisioned).toHaveLength(1);
    return provisioned[0]!.name;
  };

  return { projectId, importAs, exportedNameOf };
}

/** Console Google sign-in against the stub IdP; true when it signed the person in. */
async function googleSignIn(email: string, name?: string): Promise<boolean> {
  const start = await apiClient().get('/api/auth/google').redirects(0).expect(302);
  const state = new URL(start.headers.location as string).searchParams.get('state');
  expect(state).toBeTruthy();
  const profile = { sub: `e2e-google-${uid()}`, email, email_verified: true, name };
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

  it('an identity the import created gets the sign-up name, takes the Google name on claim, and keeps it', async () => {
    const owner = await TestUser.create();
    const localPart = `e2e-names-claimed-${uid()}`;
    const email = `${localPart}@gmail.com`;
    const { projectId, importAs } = await projectImportingOneUser(owner, {
      value: email,
      findBy: CdmFindBy.Email,
    });

    const created = await importAs('Imported Person');
    expect(created).toMatchObject({ usersCreated: 1 });
    const before = await namesIn(projectId);
    // The name an e-mail sign-up gets, never the document's.
    expect(before).toMatchObject({ global_name: localPart, display_name: 'Imported Person' });

    // The person claims the identity with Google: they take Google's name for them.
    expect(await googleSignIn(email, 'Ada From Google')).toBe(true);
    const providers = await query<{ provider: string }>`
      SELECT provider FROM user_authentication_methods
      WHERE user_id = ${before.user_id}::uuid AND deleted_at IS NULL ORDER BY provider
    `;
    expect(providers.map((p) => p.provider)).toEqual(['email', 'google']);
    expect(await namesIn(projectId)).toEqual({
      user_id: before.user_id,
      global_name: 'Ada From Google',
      display_name: 'Imported Person',
    });

    const later = await importAs('Renamed At Source');
    expect(later).toMatchObject({ usersCreated: 0, usersRenamed: 0 });
    expect(await namesIn(projectId)).toEqual({
      user_id: before.user_id,
      global_name: 'Ada From Google',
      display_name: 'Renamed At Source',
    });
  });

  it('an identity imported before this release takes the e-mail sign-up name when claimed by invitation', async () => {
    const owner = await TestUser.create({ withOrgAccount: true });
    const org = await owner.createOrganization('Names Invite Org');
    const localPart = `e2e-names-invited-${uid()}`;
    const email = `${localPart}@test.grant.dev`;
    const { projectId, importAs } = await projectImportingOneUser(owner, {
      value: email,
      findBy: CdmFindBy.Email,
    });
    await importAs('Imported Person');
    const before = await namesIn(projectId);
    // Earlier releases wrote the document's name to the global user: reproduce that state.
    await query`UPDATE users SET name = 'Imported Person' WHERE id = ${before.user_id}::uuid`;

    await owner.inviteMember(org.id, email);
    const token = await getInvitationTokenForEmail(email, org.id);
    expect(token).toBeTruthy();
    const proofToken = 'keeps-user-name-email-proof';
    await setInvitationEmailProofTokenHash(token!, hashSync(proofToken, 4));
    const registered = await apiClient()
      .post('/api/auth/register')
      .send({
        name: 'Typed Name',
        type: 'personal',
        provider: 'email',
        providerId: email,
        providerData: { password: 'Rw4&jN8!pL3x' },
        emailVerificationProof: {
          type: 'ORGANIZATION_INVITATION',
          token,
          emailProofToken: proofToken,
        },
      });
    expect(registered.status).toBe(201);
    expect(registered.body.data.account.ownerId).toBe(before.user_id);

    expect(await namesIn(projectId)).toEqual({
      user_id: before.user_id,
      global_name: localPart,
      display_name: 'Imported Person',
    });
  });

  it('a keyed user the import created gets the placeholder name, never the document name; the export gives the document name back', async () => {
    const owner = await TestUser.create();
    const { projectId, importAs, exportedNameOf } = await projectImportingOneUser(owner, {
      value: `legacy-${uid()}`,
      findBy: CdmFindBy.Key,
    });

    const created = await importAs('  Seeded Name ');
    expect(created).toMatchObject({ usersCreated: 1, usersRenamed: 0 });
    const before = await namesIn(projectId);
    expect(before).toMatchObject({ global_name: 'User', display_name: 'Seeded Name' });
    expect(await exportedNameOf(before.user_id)).toBe('Seeded Name');

    const later = await importAs('Renamed At Source');
    expect(later).toMatchObject({ usersCreated: 0, usersRenamed: 0 });
    expect(await namesIn(projectId)).toEqual({
      user_id: before.user_id,
      global_name: 'User',
      display_name: 'Renamed At Source',
    });
    expect(await exportedNameOf(before.user_id)).toBe('Renamed At Source');
  });
});
