/**
 * E2E: CDM replace keeps unchanged BYOK keys (HMAC fingerprint) and rotates
 * one changed secret in place. Does not weaken export-omits-secrets or merge-creates.
 */
import { createHash } from 'node:crypto';

import { CdmFindBy, CdmModeStrategy } from '@grantjs/schema';
import { afterAll, describe, expect, it } from 'vitest';

import type { CdmDocumentInput } from '@/lib/cdm/cdm-document.schemas';

import { cdmWithRoleTemplate, replaceMode } from '../../helpers/cdm-sync-fixtures';
import { apiClient } from '../helpers/api-client';
import { closeDbHelper, query } from '../helpers/db-tokens';
import {
  downloadPayload,
  downloadSnapshot,
  postExport,
  postImport,
  resolveJob,
  scopeForAccountProject,
} from '../helpers/sync-job';
import { TestUser } from '../helpers/test-user';

const SECRET_A = `e2e-cdm-key-secret-a-${'x'.repeat(16)}`;
const SECRET_B = `e2e-cdm-key-secret-b-${'y'.repeat(16)}`;
const SECRET_B2 = `e2e-cdm-key-secret-b2-${'z'.repeat(16)}`;

interface CreateProjectResponseBody {
  data?: { id: string };
}

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

type CdmKeyRow = {
  api_key_id: string;
  client_id: string;
  external_key: string | null;
  fingerprint: string | null;
  /** `api_keys.client_secret_fingerprint`: SHA-256 of the secret string as supplied. */
  plaintext_fingerprint: string | null;
  client_secret_hash: string;
};

function cdmWithUserKeys(
  roleKey: string,
  userId: string,
  keys: Array<{ key: string; clientSecret: string }>,
  strategy: CdmModeStrategy
): CdmDocumentInput {
  return cdmWithRoleTemplate(roleKey, {
    mode:
      strategy === CdmModeStrategy.Replace
        ? replaceMode(true)
        : { strategy: CdmModeStrategy.Merge, onConflict: null, confirmDestructive: false },
    users: [
      {
        key: { value: userId, findBy: CdmFindBy.Id },
        name: 'Key Owner',
        roles: [roleKey],
        groups: [],
        permissions: [],
        tags: [],
        primaryTag: null,
        apiKeys: keys.map((key) => ({
          key: key.key,
          clientSecret: key.clientSecret,
          clientId: null,
          name: key.key,
          description: null,
          expiresAt: null,
          metadata: null,
        })),
        metadata: null,
      },
    ],
  });
}

async function createAccountProject(owner: TestUser, name: string): Promise<string> {
  const projectRes = await apiClient()
    .post('/api/projects')
    .set('Authorization', owner.authHeader)
    .send({
      name,
      scope: { id: owner.accountId, tenant: 'account' },
    });
  expect(projectRes.status).toBe(201);
  const projectId = (projectRes.body as CreateProjectResponseBody).data?.id;
  expect(projectId).toBeDefined();
  return projectId!;
}

async function listCdmKeys(projectId: string): Promise<CdmKeyRow[]> {
  return query<CdmKeyRow>`
    SELECT
      p.api_key_id::text AS api_key_id,
      k.client_id::text AS client_id,
      p.metadata->'cdmImport'->>'externalKey' AS external_key,
      p.metadata->'cdmImport'->>'secretFingerprint' AS fingerprint,
      k.client_secret_fingerprint AS plaintext_fingerprint,
      k.client_secret_hash AS client_secret_hash
    FROM project_user_api_keys p
    JOIN api_keys k ON k.id = p.api_key_id
    WHERE p.project_id = ${projectId}::uuid
      AND p.deleted_at IS NULL
      AND k.deleted_at IS NULL
    ORDER BY p.metadata->'cdmImport'->>'externalKey'
  `;
}

afterAll(async () => {
  await closeDbHelper();
});

describe('Project sync – replace unchanged API keys', () => {
  it('keeps unchanged keys, rotates one secret, and never exports the fingerprint', async () => {
    const owner = await TestUser.create();
    expect(owner.userId).toBeTruthy();
    const userId = owner.userId!;
    const suffix = Date.now();
    const projectId = await createAccountProject(owner, 'E2E CDM replace keys');
    const scope = scopeForAccountProject(owner.accountId, projectId);
    const roleKey = `key-role-${suffix}`;
    const keys = [
      { key: 'bot-a', clientSecret: SECRET_A },
      { key: 'bot-b', clientSecret: SECRET_B },
    ];

    const first = await postImport(
      owner.authHeader,
      projectId,
      scope,
      cdmWithUserKeys(roleKey, userId, keys, CdmModeStrategy.Merge)
    );
    expect(first.status).toBe(202);
    const firstJob = await resolveJob(owner.authHeader, projectId, scope, first.job);
    expect(firstJob.result?.projectUserApiKeysCreated).toBe(2);

    const afterCreate = await listCdmKeys(projectId);
    expect(afterCreate).toHaveLength(2);
    expect(afterCreate.every((row) => row.fingerprint && row.fingerprint.length === 64)).toBe(true);
    const idsAfterCreate = afterCreate.map((row) => row.api_key_id);
    // The import holds the plaintext: a created key carries the SHA-256 of the secret as supplied.
    expect(
      Object.fromEntries(afterCreate.map((row) => [row.external_key, row.plaintext_fingerprint]))
    ).toEqual({ 'bot-a': sha256(SECRET_A), 'bot-b': sha256(SECRET_B) });

    const unchangedReplace = await postImport(
      owner.authHeader,
      projectId,
      scope,
      cdmWithUserKeys(roleKey, userId, keys, CdmModeStrategy.Replace)
    );
    expect(unchangedReplace.status).toBe(202);
    const unchangedJob = await resolveJob(owner.authHeader, projectId, scope, unchangedReplace.job);
    expect(unchangedJob.result).toMatchObject({
      projectUserApiKeysCreated: 0,
      projectUserApiKeysUnchanged: 2,
      projectUserApiKeysRotated: 0,
      projectUserApiKeysDeleted: 0,
    });

    const afterKeep = await listCdmKeys(projectId);
    expect(afterKeep.map((row) => row.api_key_id)).toEqual(idsAfterCreate);

    const rotatedReplace = await postImport(
      owner.authHeader,
      projectId,
      scope,
      cdmWithUserKeys(
        roleKey,
        userId,
        [
          { key: 'bot-a', clientSecret: SECRET_A },
          { key: 'bot-b', clientSecret: SECRET_B2 },
        ],
        CdmModeStrategy.Replace
      )
    );
    expect(rotatedReplace.status).toBe(202);
    const rotatedJob = await resolveJob(owner.authHeader, projectId, scope, rotatedReplace.job);
    expect(rotatedJob.result).toMatchObject({
      projectUserApiKeysCreated: 0,
      projectUserApiKeysUnchanged: 1,
      projectUserApiKeysRotated: 1,
      projectUserApiKeysDeleted: 0,
    });

    const afterRotate = await listCdmKeys(projectId);
    expect(afterRotate.map((row) => row.api_key_id)).toEqual(idsAfterCreate);
    // A rotate replaces the fingerprint with the new secret's; the kept key's is untouched.
    expect(
      Object.fromEntries(afterRotate.map((row) => [row.external_key, row.plaintext_fingerprint]))
    ).toEqual({ 'bot-a': sha256(SECRET_A), 'bot-b': sha256(SECRET_B2) });

    const exported = await postExport(owner.authHeader, projectId, scope, {
      version: 1,
      sections: ['users', 'roles'],
      includeUserApiKeys: true,
    });
    expect(exported.status).toBe(202);
    const exportJob = await resolveJob(owner.authHeader, projectId, scope, exported.job);
    const snapshot = await downloadSnapshot(owner.authHeader, projectId, exportJob.id, scope);
    expect(snapshot.status).toBe(200);
    expect(JSON.stringify(snapshot.snapshot)).not.toMatch(/secretFingerprint|clientSecret":"[^n]/);
    for (const secret of [SECRET_A, SECRET_B, SECRET_B2]) {
      expect(JSON.stringify(snapshot.snapshot)).not.toContain(sha256(secret));
    }

    const payload = await downloadPayload(owner.authHeader, projectId, unchangedJob.id, scope);
    expect(payload.status).toBe(200);
    expect(JSON.stringify(payload.payload)).not.toContain('secretFingerprint');

    const mergeAgain = await postImport(
      owner.authHeader,
      projectId,
      scope,
      cdmWithUserKeys(roleKey, userId, keys, CdmModeStrategy.Merge)
    );
    expect(mergeAgain.status).toBe(202);
    const mergeJob = await resolveJob(owner.authHeader, projectId, scope, mergeAgain.job);
    expect(mergeJob.result?.projectUserApiKeysCreated).toBe(2);
    expect(await listCdmKeys(projectId)).toHaveLength(4);
  });

  it('a replace that keeps a key with no plaintext fingerprint fills it, without rotating or re-hashing', async () => {
    const owner = await TestUser.create();
    const userId = owner.userId!;
    const projectId = await createAccountProject(owner, 'E2E CDM keep backfill');
    const scope = scopeForAccountProject(owner.accountId, projectId);
    const roleKey = `key-role-backfill-${Date.now()}`;
    const keys = [{ key: 'bot-kept', clientSecret: SECRET_A }];

    const first = await postImport(
      owner.authHeader,
      projectId,
      scope,
      cdmWithUserKeys(roleKey, userId, keys, CdmModeStrategy.Merge)
    );
    expect(first.status).toBe(202);
    await resolveJob(owner.authHeader, projectId, scope, first.job);

    // A key imported before the column existed has none.
    await query`
      UPDATE api_keys SET client_secret_fingerprint = NULL
      WHERE id IN (
        SELECT api_key_id FROM project_user_api_keys WHERE project_id = ${projectId}::uuid
      )
    `;
    const before = await listCdmKeys(projectId);
    expect(before).toHaveLength(1);
    expect(before[0]!.plaintext_fingerprint).toBeNull();

    const replace = await postImport(
      owner.authHeader,
      projectId,
      scope,
      cdmWithUserKeys(roleKey, userId, keys, CdmModeStrategy.Replace)
    );
    expect(replace.status).toBe(202);
    const job = await resolveJob(owner.authHeader, projectId, scope, replace.job);
    expect(job.result).toMatchObject({
      projectUserApiKeysCreated: 0,
      projectUserApiKeysUnchanged: 1,
      projectUserApiKeysRotated: 0,
      projectUserApiKeysDeleted: 0,
    });

    const after = await listCdmKeys(projectId);
    expect(after).toHaveLength(1);
    expect(after[0]!.api_key_id).toBe(before[0]!.api_key_id);
    expect(after[0]!.client_secret_hash).toBe(before[0]!.client_secret_hash);
    expect(after[0]!.plaintext_fingerprint).toBe(sha256(SECRET_A));
  });
});
