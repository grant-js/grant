import { type DbSchema, roles, users } from '@grantjs/database';
import {
  MemberType,
  OrganizationInvitationStatus,
  OrganizationMemberSortableField,
  SortOrder,
  Tenant,
} from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { config } from '@/config';
import { BadRequestError, NotFoundError } from '@/lib/errors';
import { OrganizationMemberRepository } from '@/repositories/organization-members.repository';

const organizationId = '10000000-0000-4000-8000-000000000011';
const userId = '20000000-0000-4000-8000-000000000021';
const roleId = '30000000-0000-4000-8000-000000000031';
const invitationId = '40000000-0000-4000-8000-000000000041';
const createdAt = new Date('2026-01-15T00:00:00.000Z');

const scope = { id: organizationId, tenant: Tenant.Organization };

function createChain(resolveAt?: 'offset' | 'where', rows: unknown[] = []) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    leftJoin: vi.fn(),
    where: vi.fn(),
    unionAll: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
  };
  for (const method of Object.keys(chain)) {
    chain[method].mockReturnValue(chain);
  }
  if (resolveAt === 'offset') {
    chain.offset.mockResolvedValue(rows);
  }
  if (resolveAt === 'where') {
    chain.where.mockResolvedValue(rows);
  }
  return chain;
}

function buildDb(options: {
  pageRows?: unknown[];
  memberCount?: number;
  invitationCount?: number;
  users?: unknown[];
  roles?: unknown[];
  invitations?: unknown[];
}) {
  const membersChain = createChain('offset', options.pageRows ?? []);
  const invitationsChain = createChain();
  const memberCountChain = createChain('where', [{ count: options.memberCount ?? 0 }]);
  const invitationCountChain = createChain('where', [{ count: options.invitationCount ?? 0 }]);
  const userRows = options.users ?? [];
  const roleRows = options.roles ?? [];
  const invitationRows = options.invitations ?? [];

  let pageSelects = 0;
  let countSelects = 0;
  const hydrateFromCalls: unknown[] = [];

  const select = vi.fn().mockImplementation((fields?: Record<string, unknown>) => {
    if (fields && 'count' in fields) {
      countSelects += 1;
      return countSelects === 1 ? memberCountChain : invitationCountChain;
    }
    if (fields && 'memberType' in fields) {
      pageSelects += 1;
      return pageSelects === 1 ? membersChain : invitationsChain;
    }
    if (fields && 'invitation' in fields) {
      const chain = createChain('where', invitationRows);
      return chain;
    }

    const chain = createChain();
    chain.from.mockImplementation((table: unknown) => {
      hydrateFromCalls.push(table);
      if (table === users) {
        chain.where.mockResolvedValue(userRows);
      } else if (table === roles) {
        chain.where.mockResolvedValue(roleRows);
      } else {
        chain.where.mockResolvedValue([]);
      }
      return chain;
    });
    return chain;
  });

  return {
    db: { select } as unknown as DbSchema,
    select,
    membersChain,
    invitationsChain,
    hydrateFromCalls,
  };
}

const memberPageRow = {
  id: userId,
  name: 'Ada',
  email: 'ada@example.com',
  roleName: 'Admin',
  createdAt,
  memberType: MemberType.Member,
  roleId,
  userId,
  invitationId: null,
  status: null,
};

const invitationPageRow = {
  id: invitationId,
  name: 'invited@example.com',
  email: 'invited@example.com',
  roleName: 'Viewer',
  createdAt,
  memberType: MemberType.Invitation,
  roleId,
  userId: null,
  invitationId,
  status: OrganizationInvitationStatus.Pending,
};

const userRow = {
  id: userId,
  name: 'Ada',
  pictureUrl: null,
  picturePath: null,
  metadata: {},
  deletedAt: null,
  createdAt,
  updatedAt: createdAt,
};

const roleRow = {
  id: roleId,
  name: 'Admin',
  description: null,
  metadata: {},
  searchDocument: '',
  deletedAt: null,
  createdAt,
  updatedAt: createdAt,
};

describe('OrganizationMemberRepository.getOrganizationMembers SQL page', () => {
  it('pages the member ∪ invitation union in SQL and batch-hydrates the page', async () => {
    const { db, membersChain, invitationsChain, hydrateFromCalls } = buildDb({
      pageRows: [memberPageRow],
      memberCount: 22,
      invitationCount: 3,
      users: [userRow],
      roles: [roleRow],
    });
    const repo = new OrganizationMemberRepository(db);

    const result = await repo.getOrganizationMembers({
      scope,
      page: 2,
      limit: 10,
      sort: { field: OrganizationMemberSortableField.Name, order: SortOrder.Asc },
    });

    expect(membersChain.unionAll).toHaveBeenCalledWith(invitationsChain);
    expect(membersChain.orderBy).toHaveBeenCalled();
    expect(membersChain.limit).toHaveBeenCalledWith(10);
    expect(membersChain.offset).toHaveBeenCalledWith(10);
    expect(hydrateFromCalls).toEqual([users, roles]);
    expect(result.members).toHaveLength(1);
    expect(result.members[0]).toMatchObject({
      id: userId,
      type: MemberType.Member,
      email: 'ada@example.com',
    });
    expect(result.totalCount).toBe(25);
    expect(result.hasNextPage).toBe(true);
  });

  it('does not materialize the unpaged member or invitation lists', async () => {
    const { db, membersChain } = buildDb({
      pageRows: [memberPageRow],
      memberCount: 500,
      invitationCount: 20,
      users: [userRow],
      roles: [roleRow],
    });
    const repo = new OrganizationMemberRepository(db);

    await repo.getOrganizationMembers({ scope, page: 1, limit: 5 });

    expect(membersChain.limit).toHaveBeenCalledWith(5);
    expect(membersChain.offset).toHaveBeenCalledWith(0);
    expect(membersChain.unionAll).toHaveBeenCalled();
  });

  it('clamps public limit -1 to the max page size instead of scanning all rows', async () => {
    const { db, membersChain } = buildDb({
      pageRows: [memberPageRow],
      memberCount: 1,
      invitationCount: 0,
      users: [userRow],
      roles: [roleRow],
    });
    const repo = new OrganizationMemberRepository(db);

    await repo.getOrganizationMembers({ scope, limit: -1 });

    expect(membersChain.limit).toHaveBeenCalledWith(config.system.maxPageSize);
    expect(membersChain.offset).toHaveBeenCalledWith(0);
  });

  it('skips hydration queries when the page is empty', async () => {
    const { db, hydrateFromCalls } = buildDb({
      pageRows: [],
      memberCount: 0,
      invitationCount: 0,
    });
    const repo = new OrganizationMemberRepository(db);

    const result = await repo.getOrganizationMembers({ scope, page: 1, limit: 20 });

    expect(hydrateFromCalls).toEqual([]);
    expect(result.members).toEqual([]);
    expect(result.totalCount).toBe(0);
    expect(result.hasNextPage).toBe(false);
  });

  it('throws BadRequestError when a paged member role is missing after the batch load', async () => {
    const { db } = buildDb({
      pageRows: [memberPageRow],
      memberCount: 1,
      users: [userRow],
      roles: [],
    });
    const repo = new OrganizationMemberRepository(db);

    await expect(repo.getOrganizationMembers({ scope, limit: 10 })).rejects.toBeInstanceOf(
      BadRequestError
    );
  });

  it('throws NotFoundError when a paged invitation is missing after the batch load', async () => {
    const { db } = buildDb({
      pageRows: [invitationPageRow],
      invitationCount: 1,
      roles: [roleRow],
      invitations: [],
    });
    const repo = new OrganizationMemberRepository(db);

    await expect(repo.getOrganizationMembers({ scope, limit: 10 })).rejects.toBeInstanceOf(
      NotFoundError
    );
  });
});
