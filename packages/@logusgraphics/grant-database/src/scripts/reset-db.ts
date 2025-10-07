#!/usr/bin/env tsx

import { reset } from 'drizzle-seed';

import { db } from '@/connection';
import {
  projectPermissions,
  projectPermissionsAuditLogs,
  userTags,
  userTagsAuditLogs,
} from '@/schemas';
import { groupPermissions, groupPermissionsAuditLogs } from '@/schemas/group-permissions/schema';
import { groupTags, groupTagsAuditLogs } from '@/schemas/group-tags/schema';
import { groupAuditLogs, groups } from '@/schemas/groups/schema';
import {
  organizationGroups,
  organizationGroupsAuditLogs,
} from '@/schemas/organization-groups/schema';
import {
  organizationPermissions,
  organizationPermissionsAuditLogs,
} from '@/schemas/organization-permissions/schema';
import {
  organizationProjects,
  organizationProjectsAuditLogs,
} from '@/schemas/organization-projects/schema';
import { organizationRoles, organizationRolesAuditLogs } from '@/schemas/organization-roles/schema';
import { organizationTagAuditLogs, organizationTags } from '@/schemas/organization-tags/schema';
import { organizationUsers, organizationUsersAuditLogs } from '@/schemas/organization-users/schema';
import { organizationAuditLogs, organizations } from '@/schemas/organizations/schema';
import { permissionTagAuditLogs, permissionTags } from '@/schemas/permission-tags/schema';
import { permissionAuditLogs, permissions } from '@/schemas/permissions/schema';
import { projectGroupAuditLogs, projectGroups } from '@/schemas/project-groups/schema';
import { projectRoleAuditLogs, projectRoles } from '@/schemas/project-roles/schema';
import { projectTagAuditLogs, projectTags } from '@/schemas/project-tags/schema';
import { projectUserAuditLogs, projectUsers } from '@/schemas/project-users/schema';
import { projectAuditLogs, projects } from '@/schemas/projects/schema';
import { roleGroups, roleGroupsAuditLogs } from '@/schemas/role-groups/schema';
import { roleTagAuditLogs, roleTags } from '@/schemas/role-tags/schema';
import { roleAuditLogs, roles } from '@/schemas/roles/schema';
import { tagAuditLogs, tags } from '@/schemas/tags/schema';
import { userRoles, userRolesAuditLogs } from '@/schemas/user-roles/schema';
import { users, userAuditLogs } from '@/schemas/users/schema';

async function main() {
  console.log('🗑️ Starting database reset...');

  try {
    // Reset all tables (this will clear all data)
    console.log('🧹 Resetting database tables...');
    await reset(db as any, {
      groupPermissions,
      groupPermissionsAuditLogs,
      groupTags,
      groupTagsAuditLogs,
      groups,
      groupAuditLogs,
      organizationGroups,
      organizationGroupsAuditLogs,
      organizationPermissions,
      organizationPermissionsAuditLogs,
      organizationProjects,
      organizationProjectsAuditLogs,
      organizationRoles,
      organizationRolesAuditLogs,
      organizationTags,
      organizationTagAuditLogs,
      organizationUsers,
      organizationUsersAuditLogs,
      organizations,
      organizationAuditLogs,
      permissionTags,
      permissionTagAuditLogs,
      permissions,
      permissionAuditLogs,
      projectGroups,
      projectGroupAuditLogs,
      projectPermissions,
      projectPermissionsAuditLogs,
      projectRoles,
      projectRoleAuditLogs,
      projectTags,
      projectTagAuditLogs,
      projectUsers,
      projectUserAuditLogs,
      projects,
      projectAuditLogs,
      roleGroups,
      roleGroupsAuditLogs,
      roleTags,
      roleTagAuditLogs,
      roles,
      roleAuditLogs,
      tags,
      tagAuditLogs,
      userRoles,
      userRolesAuditLogs,
      userTags,
      userTagsAuditLogs,
      users,
      userAuditLogs,
    });

    console.log('✅ Database reset completed successfully!');
    console.log('📝 All tables have been cleared and are ready for new data.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during database reset:', error);
    process.exit(1);
  }
}

main();
