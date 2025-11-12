import {
  DbSchema,
  organizationInvitations,
  organizationRoles,
  organizationUsers,
  roles,
  userAuthenticationMethods,
  userRoles,
  users,
} from '@logusgraphics/grant-database';
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
} from '@logusgraphics/grant-schema';
import { and, eq, ilike, isNull, or } from 'drizzle-orm';

import { BadRequestError, NotFoundError } from '@/lib/errors';
import { createModuleLogger } from '@/lib/logger';
import { Transaction } from '@/lib/transaction-manager.lib';

export class OrganizationMemberRepository {
  private readonly logger = createModuleLogger('OrganizationMemberRepository');

  constructor(private db: DbSchema) {}

  public async getOrganizationMembers(
    params: QueryOrganizationMembersArgs,
    tx?: Transaction
  ): Promise<OrganizationMemberPage> {
    const dbInstance = tx ?? this.db;
    const { organizationId, page = 1, limit = 50, search, sort, status } = params;
    const safePage = page ?? 1;
    const safeLimit = limit ?? 50;

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
            ilike(userAuthenticationMethods.providerId, searchLower)
          )!
        );
      }

      const membersData = await dbInstance
        .select({
          userId: users.id,
          userName: users.name,
          userEmail: userAuthenticationMethods.providerId,
          roleId: roles.id,
          roleName: roles.name,
          userCreatedAt: users.createdAt,
        })
        .from(organizationUsers)
        .innerJoin(users, eq(organizationUsers.userId, users.id))
        .leftJoin(
          userAuthenticationMethods,
          and(
            eq(userAuthenticationMethods.userId, users.id),
            eq(userAuthenticationMethods.provider, 'email'),
            isNull(userAuthenticationMethods.deletedAt)
          )
        )
        .leftJoin(userRoles, and(eq(userRoles.userId, users.id), isNull(userRoles.deletedAt)))
        .leftJoin(roles, eq(userRoles.roleId, roles.id))
        .leftJoin(
          organizationRoles,
          and(
            eq(organizationRoles.organizationId, organizationId),
            eq(organizationRoles.roleId, roles.id),
            isNull(organizationRoles.deletedAt)
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

      // Add members (deduplicate by userId, preferring entries with roles)
      const memberMap = new Map<
        string,
        {
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
        }
      >();

      for (const member of membersData) {
        const existing = memberMap.get(member.userId);
        // Prefer entry with a role, or if both have roles, keep the first one
        if (!existing || (!existing.roleId && member.roleId)) {
          memberMap.set(member.userId, {
            id: member.userId,
            name: member.userName,
            email: member.userEmail || null,
            roleId: member.roleId || null,
            roleName: member.roleName || null,
            type: MemberType.Member,
            status: null,
            createdAt: member.userCreatedAt,
            userId: member.userId,
          });
        }
      }

      // Add deduplicated members to allMembers
      allMembers.push(...Array.from(memberMap.values()));

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
        let comparison = 0;

        switch (sortField) {
          case OrganizationMemberSortableField.Name:
            comparison = a.name.localeCompare(b.name);
            break;
          case OrganizationMemberSortableField.Email:
            comparison = (a.email || '').localeCompare(b.email || '');
            break;
          case OrganizationMemberSortableField.CreatedAt:
            comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            break;
          case OrganizationMemberSortableField.Role:
            comparison = (a.roleName || '').localeCompare(b.roleName || '');
            break;
          default:
            comparison = a.name.localeCompare(b.name);
        }

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
          if (member.type === MemberType.Member && member.userId) {
            // Fetch full user and role
            const [user] = await dbInstance
              .select()
              .from(users)
              .where(eq(users.id, member.userId))
              .limit(1);

            // Fetch user's role that belongs to this organization
            const [userRole] = await dbInstance
              .select({
                role: roles,
              })
              .from(userRoles)
              .innerJoin(roles, eq(userRoles.roleId, roles.id))
              .innerJoin(
                organizationRoles,
                and(
                  eq(organizationRoles.roleId, roles.id),
                  eq(organizationRoles.organizationId, organizationId),
                  isNull(organizationRoles.deletedAt)
                )
              )
              .where(and(eq(userRoles.userId, member.userId), isNull(userRoles.deletedAt)))
              .limit(1);

            if (!userRole?.role) {
              throw new BadRequestError(
                `User ${member.userId} does not have a role assigned`,
                'errors:validation.required',
                { field: 'role', userId: member.userId },
                { userId: member.userId }
              );
            }

            return {
              id: member.id,
              name: member.name,
              email: member.email,
              type: MemberType.Member,
              role: userRole.role as unknown as Role,
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
              throw new NotFoundError(
                `Invitation not found: ${member.invitationId}`,
                'errors:notFound.invitation',
                { invitationId: member.invitationId },
                { invitationId: member.invitationId }
              );
            }

            const [roleData] = await dbInstance
              .select()
              .from(roles)
              .where(eq(roles.id, member.roleId!))
              .limit(1);

            if (!roleData) {
              throw new NotFoundError(
                `Role not found for invitation ${member.invitationId}`,
                'errors:notFound.role',
                { invitationId: member.invitationId, roleId: member.roleId },
                { invitationId: member.invitationId, roleId: member.roleId }
              );
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
            `Invalid member type or missing required data for member ${member.id}`,
            'errors:validation.invalid',
            { memberId: member.id, memberType: member.type },
            { memberId: member.id, memberType: member.type }
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
      // Fetch member (user) data
      const [memberData] = await dbInstance
        .select({
          userId: users.id,
          userName: users.name,
          userEmail: userAuthenticationMethods.providerId,
          roleId: roles.id,
          roleName: roles.name,
          userCreatedAt: users.createdAt,
        })
        .from(organizationUsers)
        .innerJoin(users, eq(organizationUsers.userId, users.id))
        .leftJoin(
          userAuthenticationMethods,
          and(
            eq(userAuthenticationMethods.userId, users.id),
            eq(userAuthenticationMethods.provider, 'email'),
            isNull(userAuthenticationMethods.deletedAt)
          )
        )
        .leftJoin(userRoles, and(eq(userRoles.userId, users.id), isNull(userRoles.deletedAt)))
        .leftJoin(roles, eq(userRoles.roleId, roles.id))
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

      // Fetch full user and role
      const [user] = await dbInstance
        .select()
        .from(users)
        .where(eq(users.id, memberData.userId))
        .limit(1);

      const [userRole] = await dbInstance
        .select({
          role: roles,
        })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(and(eq(userRoles.userId, memberData.userId), isNull(userRoles.deletedAt)))
        .limit(1);

      if (!userRole?.role) {
        throw new BadRequestError(
          `User ${memberData.userId} does not have a role assigned`,
          'errors:validation.required',
          { field: 'role', userId: memberData.userId },
          { userId: memberData.userId }
        );
      }

      return {
        id: memberData.userId,
        name: memberData.userName,
        email: memberData.userEmail || null,
        type: MemberType.Member,
        role: userRole.role as unknown as Role,
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
