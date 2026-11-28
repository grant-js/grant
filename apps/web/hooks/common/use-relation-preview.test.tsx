// @vitest-environment jsdom
import { useApolloClient } from '@apollo/client/react';
import { MockedProvider } from '@apollo/client/testing/react';
import {
  GetGroupRelationsPreviewDocument,
  GetPermissionRelationsPreviewDocument,
  GetRoleRelationsPreviewDocument,
  GetUserRelationsPreviewDocument,
  Tenant,
} from '@grantjs/schema';
import { act, renderHook, waitFor } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useRelationPage, useRelationPreview } from './use-relation-preview';

const scope = { tenant: Tenant.OrganizationProject, id: 'org-1:project-1' };
vi.mock('./use-scope-from-params', () => ({ useScopeFromParams: () => scope }));

const mocks = [
  {
    request: {
      query: GetRoleRelationsPreviewDocument,
      variables: { scope, id: 'role-1', withGroups: true, withUsers: false, withTags: false },
    },
    result: {
      data: {
        roles: {
          __typename: 'RolePage',
          roles: [
            {
              __typename: 'Role',
              id: 'role-1',
              groups: [{ __typename: 'Group', id: 'g-1', name: 'Editors' }],
            },
          ],
        },
      },
    },
  },
];

const wrapper = ({ children }: { children: ReactNode }) => (
  <MockedProvider mocks={mocks}>{children}</MockedProvider>
);

describe('useRelationPreview', () => {
  it('fetches nothing until load, then only the requested relationship', async () => {
    const { result } = renderHook(
      () => useRelationPreview({ entity: 'role', relation: 'groups' }, 'role-1'),
      { wrapper }
    );
    expect(result.current.called).toBe(false);
    expect(result.current.items).toBeUndefined();

    act(() => result.current.load());

    await waitFor(() =>
      expect(result.current.items).toEqual([
        expect.objectContaining({ id: 'g-1', name: 'Editors' }),
      ])
    );
    expect(result.current.error).toBe(false);
  });

  it('keeps the result out of the shared cache, so list queries watching the entity do not re-render', async () => {
    const { result } = renderHook(
      () => ({
        preview: useRelationPreview({ entity: 'role', relation: 'groups' }, 'role-1'),
        client: useApolloClient(),
      }),
      { wrapper }
    );

    act(() => result.current.preview.load());
    await waitFor(() => expect(result.current.preview.items).toHaveLength(1));

    const cached = result.current.client.cache.extract() as Record<string, unknown>;
    expect(Object.keys(cached).filter((key) => key !== 'ROOT_QUERY')).toEqual([]);
  });
});

describe('useRelationPreview for the users and groups chips', () => {
  const permissionUsers = {
    request: {
      query: GetPermissionRelationsPreviewDocument,
      variables: { scope, id: 'p-1', withGroups: false, withUsers: true, withTags: false },
    },
    result: {
      data: {
        permissions: {
          __typename: 'PermissionPage',
          permissions: [
            {
              __typename: 'Permission',
              id: 'p-1',
              users: [{ __typename: 'User', id: 'u-1', name: 'Ada' }],
            },
          ],
        },
      },
    },
  };
  const groupUsersDenied = {
    request: {
      query: GetGroupRelationsPreviewDocument,
      variables: {
        scope,
        id: 'g-1',
        withPermissions: false,
        withUsers: true,
        withRoles: false,
        withTags: false,
      },
    },
    result: { errors: [new GraphQLError('Forbidden')] },
  };
  const withMocks =
    (mocks: ReadonlyArray<unknown>) =>
    ({ children }: { children: ReactNode }) => (
      <MockedProvider mocks={mocks as never}>{children}</MockedProvider>
    );

  it('selects only the permission’s users', async () => {
    const { result } = renderHook(
      () => useRelationPreview({ entity: 'permission', relation: 'users' }, 'p-1'),
      { wrapper: withMocks([permissionUsers]) }
    );
    act(() => result.current.load());
    await waitFor(() =>
      expect(result.current.items).toEqual([expect.objectContaining({ id: 'u-1', name: 'Ada' })])
    );
  });

  it('reports an error, shown as "Not available", when the viewer may not list users', async () => {
    const { result } = renderHook(
      () => useRelationPreview({ entity: 'group', relation: 'users' }, 'g-1'),
      { wrapper: withMocks([groupUsersDenied]) }
    );
    act(() => result.current.load());
    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.items).toBeUndefined();
  });
});

describe('useRelationPreview for the roles, groups and permissions chips of the other lists', () => {
  const withMocks =
    (mocks: ReadonlyArray<unknown>) =>
    ({ children }: { children: ReactNode }) => (
      <MockedProvider mocks={mocks as never}>{children}</MockedProvider>
    );

  it('selects only the role’s users, with what their email is read from', async () => {
    const roleUsers = {
      request: {
        query: GetRoleRelationsPreviewDocument,
        variables: { scope, id: 'role-1', withGroups: false, withUsers: true, withTags: false },
      },
      result: {
        data: {
          roles: {
            __typename: 'RolePage',
            roles: [
              {
                __typename: 'Role',
                id: 'role-1',
                users: [
                  {
                    __typename: 'User',
                    id: 'u-1',
                    name: 'Ada',
                    authenticationMethods: [
                      {
                        __typename: 'UserAuthenticationMethod',
                        provider: 'email',
                        providerId: 'ada@example.test',
                      },
                    ],
                  },
                ],
                userCount: 1,
              },
            ],
          },
        },
      },
    };
    const { result } = renderHook(
      () => useRelationPreview({ entity: 'role', relation: 'users' }, 'role-1'),
      { wrapper: withMocks([roleUsers]) }
    );
    act(() => result.current.load());
    await waitFor(() =>
      expect(result.current.items).toEqual([
        expect.objectContaining({
          id: 'u-1',
          name: 'Ada',
          authenticationMethods: [
            expect.objectContaining({ provider: 'email', providerId: 'ada@example.test' }),
          ],
        }),
      ])
    );
  });

  it('selects only the group’s roles', async () => {
    const groupRoles = {
      request: {
        query: GetGroupRelationsPreviewDocument,
        variables: {
          scope,
          id: 'g-1',
          withPermissions: false,
          withUsers: false,
          withRoles: true,
          withTags: false,
        },
      },
      result: {
        data: {
          groups: {
            __typename: 'GroupPage',
            groups: [
              {
                __typename: 'Group',
                id: 'g-1',
                roles: [{ __typename: 'Role', id: 'r-1', name: 'Editor' }],
                roleCount: 1,
              },
            ],
          },
        },
      },
    };
    const { result } = renderHook(
      () => useRelationPreview({ entity: 'group', relation: 'roles' }, 'g-1'),
      { wrapper: withMocks([groupRoles]) }
    );
    act(() => result.current.load());
    await waitFor(() =>
      expect(result.current.items).toEqual([expect.objectContaining({ id: 'r-1', name: 'Editor' })])
    );
  });

  const userPreview = (flags: { withGroups: boolean; withPermissions: boolean }, user: object) => ({
    request: {
      query: GetUserRelationsPreviewDocument,
      variables: { scope, id: 'u-1', withRoles: false, withTags: false, ...flags },
    },
    result: {
      data: {
        users: {
          __typename: 'UserPage',
          users: [{ __typename: 'User', id: 'u-1', ...user }],
        },
      },
    },
  });

  it('lists a user’s groups from the pivot rows, dropping a row whose group is not in the scope', async () => {
    const mock = userPreview(
      { withGroups: true, withPermissions: false },
      {
        userGroups: [
          {
            __typename: 'UserGroup',
            groupId: 'g-1',
            group: { __typename: 'Group', id: 'g-1', name: 'Editors' },
          },
          { __typename: 'UserGroup', groupId: 'g-elsewhere', group: null },
          {
            __typename: 'UserGroup',
            groupId: 'g-2',
            group: { __typename: 'Group', id: 'g-2', name: 'Viewers' },
          },
        ],
        groupCount: 2,
      }
    );
    const { result } = renderHook(
      () => useRelationPreview({ entity: 'user', relation: 'groups' }, 'u-1'),
      { wrapper: withMocks([mock]) }
    );
    act(() => result.current.load());
    await waitFor(() =>
      expect(result.current.items).toEqual([
        { id: 'g-1', name: 'Editors' },
        { id: 'g-2', name: 'Viewers' },
      ])
    );
  });

  it('lists a user’s direct permissions from the pivot rows, dropping one that is not in the scope', async () => {
    const mock = userPreview(
      { withGroups: false, withPermissions: true },
      {
        userPermissions: [
          { __typename: 'UserPermission', permissionId: 'p-elsewhere', permission: null },
          {
            __typename: 'UserPermission',
            permissionId: 'p-1',
            permission: { __typename: 'Permission', id: 'p-1', name: 'Read' },
          },
        ],
        permissionCount: 1,
      }
    );
    const { result } = renderHook(
      () => useRelationPreview({ entity: 'user', relation: 'permissions' }, 'u-1'),
      { wrapper: withMocks([mock]) }
    );
    act(() => result.current.load());
    await waitFor(() => expect(result.current.items).toEqual([{ id: 'p-1', name: 'Read' }]));
  });

  it('lists nothing, not an error, for a user whose pivot rows are all outside the scope', async () => {
    const mock = userPreview(
      { withGroups: true, withPermissions: false },
      {
        userGroups: [{ __typename: 'UserGroup', groupId: 'g-elsewhere', group: null }],
        groupCount: 0,
      }
    );
    const { result } = renderHook(
      () => useRelationPreview({ entity: 'user', relation: 'groups' }, 'u-1'),
      { wrapper: withMocks([mock]) }
    );
    act(() => result.current.load());
    await waitFor(() => expect(result.current.items).toEqual([]));
    expect(result.current.error).toBe(false);
  });
});

describe('useRelationPage', () => {
  const secondPage = {
    request: {
      query: GetPermissionRelationsPreviewDocument,
      variables: {
        scope,
        id: 'p-1',
        page: 2,
        limit: 10,
        withGroups: true,
        withUsers: false,
        withTags: false,
      },
    },
    result: {
      data: {
        permissions: {
          __typename: 'PermissionPage',
          permissions: [
            {
              __typename: 'Permission',
              id: 'p-1',
              groups: [{ __typename: 'Group', id: 'g-11', name: 'Auditors' }],
              groupCount: 11,
            },
          ],
        },
      },
    },
  };

  it('fetches the requested page of the relationship with its count, from the preview document', async () => {
    const { result } = renderHook(
      () =>
        useRelationPage({ entity: 'permission', relation: 'groups' }, 'p-1', {
          page: 2,
          limit: 10,
        }),
      {
        wrapper: ({ children }: { children: ReactNode }) => (
          <MockedProvider mocks={[secondPage]}>{children}</MockedProvider>
        ),
      }
    );

    await waitFor(() =>
      expect(result.current.items).toEqual([
        expect.objectContaining({ id: 'g-11', name: 'Auditors' }),
      ])
    );
    expect(result.current.totalCount).toBe(11);
    expect(result.current.error).toBe(false);
  });
});
