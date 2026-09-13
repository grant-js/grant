/**
 * Slice 17a / F-3: persist the object key, derive pictureUrl on read.
 *
 * Local e2e storage returns a short `/storage/...` URL. Length >500 is proven
 * with a stubbed getUrl in unit tests (organizations.service.derived-picture)
 * because LocalStack community does not verify SigV4 (ADR 0007).
 */
import { afterAll, describe, expect, it } from 'vitest';

import { apiClient } from '../helpers/api-client';
import { closeDbHelper, query } from '../helpers/db-tokens';
import { graphqlRequest } from '../helpers/graphql';
import { TestUser } from '../helpers/test-user';

const jpeg = `data:image/jpeg;base64,${Buffer.from('e2e-jpeg-bytes').toString('base64')}`;
const storedPictureUrlMax = 500;
const derivedPictureUrlMax = 2048;
const longDerivedUrl = `https://s3.eu-central-1.amazonaws.com/${'x'.repeat(1200)}`;

afterAll(async () => {
  await closeDbHelper();
});

describe('picture storage keys (F-3)', () => {
  it('stores the object key and derives pictureUrl; explicit URL clears the path', async () => {
    expect(longDerivedUrl.length).toBeGreaterThan(storedPictureUrlMax);
    expect(longDerivedUrl.length).toBeLessThanOrEqual(derivedPictureUrlMax);

    const owner = await TestUser.create({ withOrgAccount: true });
    const org = await owner.createOrganization(`Picture Keys ${Date.now()}`);

    const uploadMe = await apiClient()
      .post('/api/me/picture')
      .set('Authorization', owner.authHeader)
      .send({
        file: jpeg,
        filename: 'profile.jpg',
        contentType: 'image/jpeg',
      });
    expect(uploadMe.status).toBe(201);
    expect(uploadMe.body.data.path).toMatch(/^users\/.+\/picture\.jpg$/);

    const userRows = await query<{
      id: string;
      picture_url: string | null;
      picture_path: string | null;
    }>`
      SELECT u.id, u.picture_url, u.picture_path
      FROM users u
      INNER JOIN accounts a ON a.owner_id = u.id
      WHERE a.id = ${owner.accountId}::uuid
      LIMIT 1
    `;
    expect(userRows[0]?.picture_path).toBe(uploadMe.body.data.path);
    expect(userRows[0]?.picture_url).toBeNull();
    const userId = userRows[0].id;

    const me = await graphqlRequest<{
      me: { accounts: Array<{ owner: { id: string; pictureUrl: string | null } }> };
    }>({
      query: `query { me { accounts { owner { id pictureUrl } } } }`,
      accessToken: owner.accessToken,
    });
    expect(me.body.errors).toBeUndefined();
    const ownerPicture = me.body.data?.me.accounts[0]?.owner.pictureUrl;
    expect(ownerPicture).toBe(`/storage/${uploadMe.body.data.path}`);

    const uploadOrg = await apiClient()
      .post(`/api/organizations/${org.id}/picture`)
      .set('Authorization', owner.authHeader)
      .send({
        file: jpeg,
        filename: 'logo.jpg',
        contentType: 'image/jpeg',
        scope: { id: org.id, tenant: 'organization' },
      });
    expect(uploadOrg.status).toBe(201);
    expect(uploadOrg.body.data.path).toBe(`organizations/${org.id}/picture.jpg`);

    const orgRows = await query<{
      picture_url: string | null;
      picture_path: string | null;
    }>`
      SELECT picture_url, picture_path
      FROM organizations
      WHERE id = ${org.id}::uuid
    `;
    expect(orgRows[0]?.picture_path).toBe(uploadOrg.body.data.path);
    expect(orgRows[0]?.picture_url).toBeNull();

    const orgs = await apiClient()
      .get('/api/organizations')
      .query({ scopeId: org.id, tenant: 'organization' })
      .set('Authorization', owner.authHeader);
    expect(orgs.status).toBe(200);
    const listed = (orgs.body.data.items as Array<{ id: string; pictureUrl: string | null }>).find(
      (item) => item.id === org.id
    );
    expect(listed?.pictureUrl).toBe(`/storage/${uploadOrg.body.data.path}`);
    expect(listed?.pictureUrl?.length).toBeLessThanOrEqual(derivedPictureUrlMax);

    const update = await apiClient()
      .patch(`/api/users/${userId}`)
      .set('Authorization', owner.authHeader)
      .send({
        scope: { id: owner.accountId, tenant: 'account' },
        pictureUrl: 'https://idp.example/avatar.png',
      });
    expect(update.status).toBe(200);

    const cleared = await query<{
      picture_url: string | null;
      picture_path: string | null;
    }>`
      SELECT picture_url, picture_path
      FROM users
      WHERE id = ${userId}::uuid
    `;
    expect(cleared[0]?.picture_url).toBe('https://idp.example/avatar.png');
    expect(cleared[0]?.picture_path).toBeNull();
  });
});
