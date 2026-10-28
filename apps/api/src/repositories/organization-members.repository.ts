import type { IOrganizationMemberRepository } from '@grantjs/core';
import {
  DbSchema,
  organizationInvitations,
  organizationUsers,
  roles,
  userAuthenticationMethods,
  users,
} from '@grantjs/database';
import {
  MemberType,
  OrganizationInvitation,
  OrganizationInvitationStatus,
  OrganizationMember,
  OrganizationMemberPage,
  OrganizationMemberSortableField,
  QueryOrganizationMembersArgs,
  Role,
  SortOrder,
  User,
} from '@grantjs/schema';
import { and, asc, count, desc, eq, ilike, inArray, isNull, or, type SQL, sql } from 'drizzle-orm';

import { config } from '@/config';
import { BadRequestError, NotFoundError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';
import { clampPageLimit, hasNextPageByCount } from '@/lib/pagination.lib';
import { Transaction } from '@/lib/transaction-manager.lib';

type OrganizationMemberPageRow = {
  id: string;
  name: string;
  email: string | null;
  roleName: string | null;
  createdAt: Date;
  memberType: string;
  roleId: string | null;
  userId: string | null;
  invitationId: string | null;
  status: string | null;
};

/** Unique union output names. Bare `users.name` / `roles.name` made ORDER BY "name" ambiguous. */
const PAGE_COLUMN = {
  id: 'id',
  name: 'name',
  email: 'email',
  roleName: 'role_name',
  createdAt: 'created_at',
  memberType: 'member_type',
  roleId: 'role_id',
  userId: 'user_id',
  invitationId: 'invitation_id',
  status: 'status',
} as const;

function pageOrderIdent(alias: (typeof PAGE_COLUMN)[keyof typeof PAGE_COLUMN]): SQL {
  return sql.raw(`"${alias}"`);
}

export class OrganizationMemberRepository implements IOrganizationMemberRepository {
  private readonly logger = createLogger('OrganizationMemberRepository');

  constructor(private db: DbSchema) {}

  public async getOrganizationMembers(
    params: QueryOrganizationMembersArgs,
    tx?: Transaction
  ): Promise<OrganizationMemberPage> {
    const dbInstance = tx ?? this.db;
    const { scope, page = 1, limit, search, sort, status } = params;
    const { id: organizationId } = scope;
    const safePage = page ?? 1;
    const safeLimit =
      clampPageLimit(limit, {
        defaultPageSize: config.system.defaultPageSize,
        maxPageSize: config.system.maxPageSize,
      }) ?? config.system.defaultPageSize;

    try {
      const memberWhere = this.memberWhere(organizationId, search);
      const invitationWhere = this.invitationWhere(organizationId, status, search);
      const emailExpression = sql<string | null>`
        CASE
          WHEN ${userAuthenticationMethods.provider} = 'email' THEN ${userAuthenticationMethods.providerId}
          ELSE ${userAuthenticationMethods.providerData}->>'email'
        END
      `.as(PAGE_COLUMN.email);

      const membersSelect = dbInstance
        .select({
          id: sql<string>`${users.id}`.as(PAGE_COLUMN.id),
          name: sql<string>`${users.name}`.as(PAGE_COLUMN.name),
          email: emailExpression,
          roleName: sql<string>`${roles.name}`.as(PAGE_COLUMN.roleName),
          createdAt: sql<Date>`${users.createdAt}`.as(PAGE_COLUMN.createdAt),
          memberType: sql<string>`'member'`.as(PAGE_COLUMN.memberType),
          roleId: sql<string | null>`${roles.id}`.as(PAGE_COLUMN.roleId),
          userId: sql<string | null>`${users.id}`.as(PAGE_COLUMN.userId),
          invitationId: sql<string | null>`null::uuid`.as(PAGE_COLUMN.invitationId),
          status: sql<string | null>`null::varchar`.as(PAGE_COLUMN.status),
        })
        .from(organizationUsers)
        .innerJoin(users, eq(organizationUsers.userId, users.id))
        .innerJoin(roles, eq(organizationUsers.roleId, roles.id))
        .leftJoin(
          userAuthenticationMethods,
          and(
            eq(userAuthenticationMethods.userId, users.id),
            eq(userAuthenticationMethods.isPrimary, true),
            isNull(userAuthenticationMethods.deletedAt)
          )
        )
        .where(memberWhere);

      const invitationsSelect = dbInstance
        .select({
          id: sql<string>`${organizationInvitations.id}`.as(PAGE_COLUMN.id),
          name: sql<string>`${organizationInvitations.email}`.as(PAGE_COLUMN.name),
          email: sql<string | null>`${organizationInvitations.email}`.as(PAGE_COLUMN.email),
          roleName: sql<string>`${roles.name}`.as(PAGE_COLUMN.roleName),
          createdAt: sql<Date>`${organizationInvitations.createdAt}`.as(PAGE_COLUMN.createdAt),
          memberType: sql<string>`'invitation'`.as(PAGE_COLUMN.memberType),
          roleId: sql<string | null>`${roles.id}`.as(PAGE_COLUMN.roleId),
          userId: sql<string | null>`null::uuid`.as(PAGE_COLUMN.userId),
          invitationId: sql<string | null>`${organizationInvitations.id}`.as(
            PAGE_COLUMN.invitationId
          ),
          status: sql<string | null>`${organizationInvitations.status}`.as(PAGE_COLUMN.status),
        })
        .from(organizationInvitations)
        .innerJoin(roles, eq(organizationInvitations.roleId, roles.id))
        .where(invitationWhere);

      const pageRows = (await membersSelect
        .unionAll(invitationsSelect)
        .orderBy(...this.pageOrderBy(sort))
        .limit(safeLimit)
        .offset((safePage - 1) * safeLimit)) as OrganizationMemberPageRow[];

      const [memberCountRow] = await dbInstance
        .select({ count: count() })
        .from(organizationUsers)
        .innerJoin(users, eq(organizationUsers.userId, users.id))
        .innerJoin(roles, eq(organizationUsers.roleId, roles.id))
        .leftJoin(
          userAuthenticationMethods,
          and(
            eq(userAuthenticationMethods.userId, users.id),
            eq(userAuthenticationMethods.isPrimary, true),
            isNull(userAuthenticationMethods.deletedAt)
          )
        )
        .where(memberWhere);

      const [invitationCountRow] = await dbInstance
        .select({ count: count() })
        .from(organizationInvitations)
        .innerJoin(roles, eq(organizationInvitations.roleId, roles.id))
        .where(invitationWhere);

      const totalCount =
        Number(memberCountRow?.count ?? 0) + Number(invitationCountRow?.count ?? 0);
      const members = await this.hydratePage(pageRows, dbInstance);
      const hasNextPage = hasNextPageByCount({
        page: safePage,
        limit: safeLimit,
        totalCount,
      });

      return {
        members,
        totalCount,
        hasNextPage,
      };
    } catch (error) {
      this.logger.error({
        msg: 'Error fetching organization members',
        err: error,
        organizationId,
      });
      throw error;
    }
  }

  public async getOrganizationMember(
    params: {
      organizationId: string;
      userId: string;
    },
    tx?: Transaction
  ): Promise<OrganizationMember | null> {
    const dbInstance = tx ?? this.db;

    try {
      // Build email expression that extracts email from providerId (for email auth)
      // or from providerData.email (for OAuth providers like GitHub)
      const emailExpression = sql<string>`
        CASE 
          WHEN ${userAuthenticationMethods.provider} = 'email' THEN ${userAuthenticationMethods.providerId}
          ELSE ${userAuthenticationMethods.providerData}->>'email'
        END
      `.as('user_email');

      // Fetch member (user) data with role from organization_users.role_id
      const [memberData] = await dbInstance
        .select({
          userId: users.id,
          userName: users.name,
          userEmail: emailExpression,
          roleId: roles.id,
          roleName: roles.name,
          userCreatedAt: users.createdAt,
        })
        .from(organizationUsers)
        .innerJoin(users, eq(organizationUsers.userId, users.id))
        .innerJoin(roles, eq(organizationUsers.roleId, roles.id))
        .leftJoin(
          userAuthenticationMethods,
          and(
            eq(userAuthenticationMethods.userId, users.id),
            eq(userAuthenticationMethods.isPrimary, true),
            isNull(userAuthenticationMethods.deletedAt)
          )
        )
        .where(
          and(
            eq(organizationUsers.organizationId, params.organizationId),
            eq(organizationUsers.userId, params.userId),
            isNull(organizationUsers.deletedAt),
            isNull(users.deletedAt)
          )
        )
        .limit(1);

      if (!memberData) {
        return null;
      }

      const [user] = await dbInstance
        .select()
        .from(users)
        .where(eq(users.id, memberData.userId))
        .limit(1);

      const [roleRow] = await dbInstance
        .select()
        .from(roles)
        .where(eq(roles.id, memberData.roleId))
        .limit(1);

      if (!roleRow) {
        throw new BadRequestError(
          `User ${memberData.userId} has invalid role ${memberData.roleId}`
        );
      }

      return {
        id: memberData.userId,
        name: memberData.userName,
        email: memberData.userEmail || null,
        type: MemberType.Member,
        role: roleRow as unknown as Role,
        user: user as unknown as User,
        invitation: null,
        status: null,
        createdAt: memberData.userCreatedAt,
      } as OrganizationMember;
    } catch (error) {
      this.logger.error({
        msg: 'Error fetching organization member',
        err: error,
        organizationId: params.organizationId,
        userId: params.userId,
      });
      throw error;
    }
  }

  private memberWhere(organizationId: string, search?: string | null) {
    const conditions = [
      eq(organizationUsers.organizationId, organizationId),
      isNull(organizationUsers.deletedAt),
      isNull(users.deletedAt),
    ];

    if (search) {
      const searchLower = `%${search.toLowerCase()}%`;
      conditions.push(
        or(
          ilike(users.name, searchLower),
          ilike(userAuthenticationMethods.providerId, searchLower),
          sql`${userAuthenticationMethods.providerData}->>'email' ILIKE ${searchLower}`
        )!
      );
    }

    return and(...conditions);
  }

  private invitationWhere(
    organizationId: string,
    status?: OrganizationInvitationStatus | null,
    search?: string | null
  ) {
    const conditions = [
      eq(organizationInvitations.organizationId, organizationId),
      isNull(organizationInvitations.deletedAt),
      eq(organizationInvitations.status, status ?? OrganizationInvitationStatus.Pending),
    ];

    if (search) {
      conditions.push(ilike(organizationInvitations.email, `%${search.toLowerCase()}%`));
    }

    return and(...conditions);
  }

  private pageOrderBy(sort?: QueryOrganizationMembersArgs['sort']): SQL[] {
    const sortField = sort?.field ?? OrganizationMemberSortableField.Name;
    const sortOrder = sort?.order ?? SortOrder.Asc;
    const direction = sortOrder === SortOrder.Desc ? desc : asc;
    const sortColumn = (() => {
      switch (sortField) {
        case OrganizationMemberSortableField.Email:
          return pageOrderIdent(PAGE_COLUMN.email);
        case OrganizationMemberSortableField.CreatedAt:
          return pageOrderIdent(PAGE_COLUMN.createdAt);
        case OrganizationMemberSortableField.Role:
          return pageOrderIdent(PAGE_COLUMN.roleName);
        case OrganizationMemberSortableField.Name:
        default:
          return pageOrderIdent(PAGE_COLUMN.name);
      }
    })();

    return [direction(sortColumn), direction(pageOrderIdent(PAGE_COLUMN.id))];
  }

  private async hydratePage(
    pageRows: OrganizationMemberPageRow[],
    dbInstance: DbSchema | Transaction
  ): Promise<OrganizationMember[]> {
    const userIds = [
      ...new Set(
        pageRows
          .filter((row) => row.memberType === MemberType.Member && row.userId)
          .map((row) => row.userId as string)
      ),
    ];
    const roleIds = [
      ...new Set(pageRows.map((row) => row.roleId).filter((roleId): roleId is string => !!roleId)),
    ];
    const invitationIds = [
      ...new Set(
        pageRows
          .filter((row) => row.memberType === MemberType.Invitation && row.invitationId)
          .map((row) => row.invitationId as string)
      ),
    ];

    const [userRows, roleRows, invitationRows] = await Promise.all([
      userIds.length > 0
        ? dbInstance.select().from(users).where(inArray(users.id, userIds))
        : Promise.resolve([]),
      roleIds.length > 0
        ? dbInstance.select().from(roles).where(inArray(roles.id, roleIds))
        : Promise.resolve([]),
      invitationIds.length > 0
        ? dbInstance
            .select({
              invitation: organizationInvitations,
              inviter: users,
            })
            .from(organizationInvitations)
            .innerJoin(
              users,
              and(eq(organizationInvitations.invitedBy, users.id), isNull(users.deletedAt))
            )
            .where(inArray(organizationInvitations.id, invitationIds))
        : Promise.resolve([]),
    ]);

    const userById = new Map(userRows.map((user) => [user.id, user]));
    const roleById = new Map(roleRows.map((role) => [role.id, role]));
    const invitationById = new Map(invitationRows.map((row) => [row.invitation.id, row] as const));

    return pageRows.map((row) => this.hydrateRow(row, userById, roleById, invitationById));
  }

  private hydrateRow(
    row: OrganizationMemberPageRow,
    userById: Map<string, typeof users.$inferSelect>,
    roleById: Map<string, typeof roles.$inferSelect>,
    invitationById: Map<
      string,
      {
        invitation: typeof organizationInvitations.$inferSelect;
        inviter: typeof users.$inferSelect;
      }
    >
  ): OrganizationMember {
    if (row.memberType === MemberType.Member && row.userId && row.roleId) {
      const roleRow = roleById.get(row.roleId);
      if (!roleRow) {
        throw new BadRequestError(`User ${row.userId} has invalid role ${row.roleId}`);
      }

      return {
        id: row.id,
        name: row.name,
        email: row.email || null,
        type: MemberType.Member,
        role: roleRow as unknown as Role,
        user: (userById.get(row.userId) ?? null) as unknown as User,
        invitation: null,
        status: null,
        createdAt: row.createdAt,
      } as OrganizationMember;
    }

    if (row.memberType === MemberType.Invitation && row.invitationId) {
      const invitationWithInviter = invitationById.get(row.invitationId);
      if (!invitationWithInviter) {
        throw new NotFoundError('Invitation', row.invitationId);
      }

      const roleData = row.roleId ? roleById.get(row.roleId) : undefined;
      if (!roleData) {
        throw new NotFoundError('Role', row.roleId ?? undefined);
      }

      const invitationData = {
        ...invitationWithInviter.invitation,
        inviter: invitationWithInviter.inviter,
      } as unknown as OrganizationInvitation;

      return {
        id: row.id,
        name: row.name,
        email: row.email,
        type: MemberType.Invitation,
        role: roleData as unknown as Role,
        user: null,
        invitation: invitationData,
        status: row.status as OrganizationInvitationStatus,
        createdAt: row.createdAt,
      } as OrganizationMember;
    }

    throw new BadRequestError(`Invalid member type or missing required data for member ${row.id}`);
  }
}
