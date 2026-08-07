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
import { and, eq, ilike, isNull, or, sql } from 'drizzle-orm';

import { config } from '@/config';
import { BadRequestError, NotFoundError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';
import { Transaction } from '@/lib/transaction-manager.lib';

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
    const safeLimit = limit ?? config.system.defaultPageSize;

    try {
      // Fetch members (users)
      const memberWhereConditions = [
        eq(organizationUsers.organizationId, organizationId),
        isNull(organizationUsers.deletedAt),
        isNull(users.deletedAt),
      ];

      if (search) {
        const searchLower = `%${search.toLowerCase()}%`;
        memberWhereConditions.push(
          or(
            ilike(users.name, searchLower),
            // Search in providerId (for email auth) or providerData.email (for OAuth)
            ilike(userAuthenticationMethods.providerId, searchLower),
            sql`${userAuthenticationMethods.providerData}->>'email' ILIKE ${searchLower}`
          )!
        );
      }

      // Build email expression that extracts email from providerId (for email auth)
      // or from providerData.email (for OAuth providers like GitHub)
      const emailExpression = sql<string>`
        CASE 
          WHEN ${userAuthenticationMethods.provider} = 'email' THEN ${userAuthenticationMethods.providerId}
          ELSE ${userAuthenticationMethods.providerData}->>'email'
        END
      `.as('user_email');

      const membersData = await dbInstance
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
        .where(and(...memberWhereConditions));

      // Fetch invitations
      const invitationWhereConditions = [
        eq(organizationInvitations.organizationId, organizationId),
        isNull(organizationInvitations.deletedAt),
      ];

      if (status) {
        invitationWhereConditions.push(eq(organizationInvitations.status, status));
      } else {
        invitationWhereConditions.push(
          eq(organizationInvitations.status, OrganizationInvitationStatus.Pending)
        );
      }

      if (search) {
        const searchLower = `%${search.toLowerCase()}%`;
        invitationWhereConditions.push(ilike(organizationInvitations.email, searchLower));
      }

      const invitationsData = await dbInstance
        .select({
          invitationId: organizationInvitations.id,
          invitationEmail: organizationInvitations.email,
          roleId: roles.id,
          roleName: roles.name,
          status: organizationInvitations.status,
          invitationCreatedAt: organizationInvitations.createdAt,
          invitedBy: organizationInvitations.invitedBy,
        })
        .from(organizationInvitations)
        .innerJoin(roles, eq(organizationInvitations.roleId, roles.id))
        .where(and(...invitationWhereConditions));

      // Transform to unified format
      const allMembers: Array<{
        id: string;
        name: string;
        email: string | null;
        roleId: string | null;
        roleName: string | null;
        type: MemberType;
        status: OrganizationInvitationStatus | null;
        createdAt: Date;
        userId?: string;
        invitationId?: string;
      }> = [];

      // Add members (one row per membership; role from organization_users.role_id)
      for (const member of membersData) {
        allMembers.push({
          id: member.userId,
          name: member.userName,
          email: member.userEmail || null,
          roleId: member.roleId,
          roleName: member.roleName,
          type: MemberType.Member,
          status: null,
          createdAt: member.userCreatedAt,
          userId: member.userId,
        });
      }

      // Add invitations
      for (const invitation of invitationsData) {
        allMembers.push({
          id: invitation.invitationId,
          name: invitation.invitationEmail,
          email: invitation.invitationEmail,
          roleId: invitation.roleId || null,
          roleName: invitation.roleName || null,
          type: MemberType.Invitation,
          status: invitation.status as OrganizationInvitationStatus,
          createdAt: invitation.invitationCreatedAt,
          invitationId: invitation.invitationId,
        });
      }

      // Sort combined results
      const sortField = sort?.field ?? OrganizationMemberSortableField.Name;
      const sortOrder = sort?.order ?? SortOrder.Asc;

      allMembers.sort((a, b) => {
        const comparison = (() => {
          switch (sortField) {
            case OrganizationMemberSortableField.Name:
              return a.name.localeCompare(b.name);
            case OrganizationMemberSortableField.Email:
              return (a.email || '').localeCompare(b.email || '');
            case OrganizationMemberSortableField.CreatedAt:
              return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            case OrganizationMemberSortableField.Role:
              return (a.roleName || '').localeCompare(b.roleName || '');
            default:
              return a.name.localeCompare(b.name);
          }
        })();
        return sortOrder === SortOrder.Asc ? comparison : -comparison;
      });

      const totalCount = allMembers.length;

      // Apply pagination
      const paginationLimit = safeLimit > -1 ? safeLimit : undefined;
      const startIndex = paginationLimit ? (safePage - 1) * paginationLimit : 0;
      const endIndex = paginationLimit ? startIndex + paginationLimit : allMembers.length;
      const paginatedMembers = allMembers.slice(startIndex, endIndex);

      // Fetch full entity data for paginated results
      const members: OrganizationMember[] = await Promise.all(
        paginatedMembers.map(async (member) => {
          if (member.type === MemberType.Member && member.userId && member.roleId) {
            // Fetch full user and role (role from organization_users.role_id)
            const [user] = await dbInstance
              .select()
              .from(users)
              .where(eq(users.id, member.userId))
              .limit(1);

            const [roleRow] = await dbInstance
              .select()
              .from(roles)
              .where(eq(roles.id, member.roleId))
              .limit(1);

            if (!roleRow) {
              throw new BadRequestError(`User ${member.userId} has invalid role ${member.roleId}`);
            }

            return {
              id: member.id,
              name: member.name,
              email: member.email,
              type: MemberType.Member,
              role: roleRow as unknown as Role,
              user: user as unknown as User,
              invitation: null,
              status: null,
              createdAt: member.createdAt,
            } as OrganizationMember;
          } else if (member.type === MemberType.Invitation && member.invitationId) {
            // Fetch full invitation with inviter and role
            const [invitationWithInviter] = await dbInstance
              .select({
                invitation: organizationInvitations,
                inviter: users,
              })
              .from(organizationInvitations)
              .innerJoin(
                users,
                and(eq(organizationInvitations.invitedBy, users.id), isNull(users.deletedAt))
              )
              .where(eq(organizationInvitations.id, member.invitationId))
              .limit(1);

            if (!invitationWithInviter) {
              throw new NotFoundError('Invitation', member.invitationId);
            }

            const [roleData] = await dbInstance
              .select()
              .from(roles)
              .where(eq(roles.id, member.roleId!))
              .limit(1);

            if (!roleData) {
              throw new NotFoundError('Role', member.roleId ?? undefined);
            }

            // Construct invitation with inviter relation
            const invitationData = {
              ...invitationWithInviter.invitation,
              inviter: invitationWithInviter.inviter,
            } as unknown as OrganizationInvitation;

            return {
              id: member.id,
              name: member.name,
              email: member.email,
              type: MemberType.Invitation,
              role: roleData as unknown as Role,
              user: null,
              invitation: invitationData,
              status: member.status,
              createdAt: member.createdAt,
            } as OrganizationMember;
          }

          // Fallback (shouldn't happen)
          throw new BadRequestError(
            `Invalid member type or missing required data for member ${member.id}`
          );
        })
      );

      const hasNextPage = paginationLimit ? safePage * paginationLimit < totalCount : false;

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
}
