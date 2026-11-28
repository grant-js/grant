// @vitest-environment jsdom
import { useApolloClient } from '@apollo/client/react';
import { MockedProvider } from '@apollo/client/testing/react';
import {
  GetGroupRelationsPreviewDocument,
  GetPermissionRelationsPreviewDocument,
  GetRoleRelationsPreviewDocument,
  Tenant,
} from '@grantjs/schema';
import { act, renderHook, waitFor } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useRelationPreview } from './use-relation-preview';

const scope = { tenant: Tenant.OrganizationProject, id: 'org-1:project-1' };
vi.mock('./use-scope-from-params', () => ({ useScopeFromParams: () => scope }));

const mocks = [
  {
    request: {
      query: GetRoleRelationsPreviewDocument,
      variables: { scope, id: 'role-1', withGroups: true, withTags: false },
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
      variables: { scope, id: 'g-1', withPermissions: false, withUsers: true, withTags: false },
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
