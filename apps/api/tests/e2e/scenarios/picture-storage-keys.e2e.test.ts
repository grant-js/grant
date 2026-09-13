/**
 * Slice 17a / F-3: persist the object key, derive pictureUrl on read.
 *
 * Local e2e storage returns a short `/storage/...` URL. Length >500 is proven
 * with a stubbed getUrl in unit tests (organizations.service.derived-picture)
 * because LocalStack community does not verify SigV4 (ADR 0007).
 */
import { afterAll, describe, expect, it } from 'vitest';

import { apiClient } from '../helpers/api-client';
import { addProjectUserForE2e, closeDbHelper, query } from '../helpers/db-tokens';
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
      .query({ scopeId: owner.orgAccountId, tenant: 'account' })
      .set('Authorization', owner.authHeader);
    expect(orgs.status).toBe(200);
    const listed = (orgs.body.data.items as Array<{ id: string; pictureUrl: string | null }>).find(
      (item) => item.id === org.id
    );
    expect(listed?.pictureUrl).toBe(`/storage/${uploadOrg.body.data.path}`);
    expect(listed?.pictureUrl?.length).toBeLessThanOrEqual(derivedPictureUrlMax);

    // Creating a project does not insert project_users; membership picture
    // lives on that pivot. PATCH /api/users/:id cannot update the platform
    // user in account scope (not a User resource there).
    const project = await owner.createProject(org.id, `Picture Keys Project ${Date.now()}`);
    expect(project.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    await addProjectUserForE2e(project.id, userId);

    const uploadMembership = await graphqlRequest<{
      uploadMyProjectMembershipPicture: { path: string };
    }>({
      query: `mutation ($input: UploadMyProjectMembershipPictureInput!) {
        uploadMyProjectMembershipPicture(input: $input) { path }
      }`,
      variables: {
        input: {
          projectId: project.id,
          file: jpeg,
          filename: 'member.jpg',
          contentType: 'image/jpeg',
        },
      },
      accessToken: owner.accessToken,
    });
    expect(uploadMembership.body.errors).toBeUndefined();
    const membershipPath = uploadMembership.body.data?.uploadMyProjectMembershipPicture.path;
    expect(membershipPath).toBe(`users/${userId}/projects/${project.id}/picture.jpg`);

    const membershipRows = await query<{
      picture_url: string | null;
      picture_path: string | null;
    }>`
      SELECT picture_url, picture_path
      FROM project_users
      WHERE project_id = ${project.id}::uuid
        AND user_id = ${userId}::uuid
        AND deleted_at IS NULL
      LIMIT 1
    `;
    expect(membershipRows[0]?.picture_path).toBe(membershipPath);
    expect(membershipRows[0]?.picture_url).toBeNull();

    const update = await apiClient()
      .patch(`/api/me/project-memberships/${project.id}`)
      .set('Authorization', owner.authHeader)
      .send({
        pictureUrl: 'https://idp.example/avatar.png',
      });
    expect(update.status).toBe(200);

    const cleared = await query<{
      picture_url: string | null;
      picture_path: string | null;
    }>`
      SELECT picture_url, picture_path
      FROM project_users
      WHERE project_id = ${project.id}::uuid
        AND user_id = ${userId}::uuid
        AND deleted_at IS NULL
      LIMIT 1
    `;
    expect(cleared[0]?.picture_url).toBe('https://idp.example/avatar.png');
    expect(cleared[0]?.picture_path).toBeNull();

    const projectScope = { id: `${org.id}:${project.id}`, tenant: 'organizationProject' };

    const uploadProject = await apiClient()
      .post(`/api/projects/${project.id}/picture`)
      .set('Authorization', owner.authHeader)
      .send({
        file: jpeg,
        filename: 'project.jpg',
        contentType: 'image/jpeg',
        scope: projectScope,
      });
    expect(uploadProject.status).toBe(201);
    expect(uploadProject.body.data.path).toBe(`projects/${project.id}/picture.jpg`);

    const projectRows = await query<{
      picture_url: string | null;
      picture_path: string | null;
    }>`
      SELECT picture_url, picture_path
      FROM projects
      WHERE id = ${project.id}::uuid
    `;
    expect(projectRows[0]?.picture_path).toBe(uploadProject.body.data.path);
    expect(projectRows[0]?.picture_url).toBeNull();

    const listedProjects = await apiClient()
      .get('/api/projects')
      .query({ scopeId: org.id, tenant: 'organization' })
      .set('Authorization', owner.authHeader);
    expect(listedProjects.status).toBe(200);
    const listedProject = (
      listedProjects.body.data.projects as Array<{ id: string; pictureUrl: string | null }>
    ).find((item) => item.id === project.id);
    expect(listedProject?.pictureUrl).toBe(`/storage/${uploadProject.body.data.path}`);

    const createApp = await graphqlRequest<{
      createProjectApp: { id: string };
    }>({
      query: `mutation ($input: CreateProjectAppInput!) {
        createProjectApp(input: $input) { id }
      }`,
      variables: {
        input: {
          scope: projectScope,
          name: 'Picture Keys App',
          redirectUris: ['https://example.com/oauth/callback'],
          allowSignUp: false,
        },
      },
      accessToken: owner.accessToken,
    });
    expect(createApp.body.errors).toBeUndefined();
    const appId = createApp.body.data?.createProjectApp.id;
    expect(appId).toBeDefined();

    const uploadApp = await apiClient()
      .post(`/api/project-apps/${appId}/picture`)
      .set('Authorization', owner.authHeader)
      .send({
        file: jpeg,
        filename: 'app.jpg',
        contentType: 'image/jpeg',
        scope: projectScope,
      });
    expect(uploadApp.status).toBe(201);
    expect(uploadApp.body.data.path).toBe(`project-apps/${appId}/picture.jpg`);

    const appRows = await query<{
      picture_url: string | null;
      picture_path: string | null;
    }>`
      SELECT picture_url, picture_path
      FROM project_apps
      WHERE id = ${appId}::uuid
    `;
    expect(appRows[0]?.picture_path).toBe(uploadApp.body.data.path);
    expect(appRows[0]?.picture_url).toBeNull();

    const clearProject = await apiClient()
      .delete(`/api/projects/${project.id}/picture`)
      .set('Authorization', owner.authHeader)
      .send({ scope: projectScope });
    expect(clearProject.status).toBe(200);
    expect(clearProject.body.data.pictureUrl).toBeNull();
  });
});
