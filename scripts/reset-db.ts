#!/usr/bin/env tsx

import { reset } from 'drizzle-seed';

import { db } from '@/graphql/lib/database/connection';
import {
  groupPermissions,
  groupPermissionsAuditLogs,
} from '@/graphql/repositories/group-permissions/schema';
import { groupTags, groupTagsAuditLogs } from '@/graphql/repositories/group-tags/schema';
import { groupAuditLogs, groups } from '@/graphql/repositories/groups/schema';
import {
  organizationGroups,
  organizationGroupsAuditLogs,
} from '@/graphql/repositories/organization-groups/schema';
import {
  organizationPermissions,
  organizationPermissionsAuditLogs,
} from '@/graphql/repositories/organization-permissions/schema';
import {
  organizationProjects,
  organizationProjectsAuditLogs,
} from '@/graphql/repositories/organization-projects/schema';
import {
  organizationRoles,
  organizationRolesAuditLogs,
} from '@/graphql/repositories/organization-roles/schema';
import {
  organizationTagAuditLogs,
  organizationTags,
} from '@/graphql/repositories/organization-tags/schema';
import {
  organizationUsers,
  organizationUsersAuditLogs,
} from '@/graphql/repositories/organization-users/schema';
import { organizationAuditLogs, organizations } from '@/graphql/repositories/organizations/schema';
import {
  permissionTagAuditLogs,
  permissionTags,
} from '@/graphql/repositories/permission-tags/schema';
import { permissionAuditLogs, permissions } from '@/graphql/repositories/permissions/schema';
import { projectGroupAuditLogs, projectGroups } from '@/graphql/repositories/project-groups/schema';
import {
  projectPermissions,
  projectPermissionsAuditLogs,
} from '@/graphql/repositories/project-permissions/schema';
import { projectRoleAuditLogs, projectRoles } from '@/graphql/repositories/project-roles/schema';
import { projectTagAuditLogs, projectTags } from '@/graphql/repositories/project-tags/schema';
import { projectUserAuditLogs, projectUsers } from '@/graphql/repositories/project-users/schema';
import { projectAuditLogs, projects } from '@/graphql/repositories/projects/schema';
import { roleGroups, roleGroupsAuditLogs } from '@/graphql/repositories/role-groups/schema';
import { roleTagAuditLogs, roleTags } from '@/graphql/repositories/role-tags/schema';
import { roleAuditLogs, roles } from '@/graphql/repositories/roles/schema';
import { tagAuditLogs, tags } from '@/graphql/repositories/tags/schema';
import { userRoles, userRolesAuditLogs } from '@/graphql/repositories/user-roles/schema';
import { userTags, userTagsAuditLogs } from '@/graphql/repositories/user-tags/schema';
import { users, userAuditLogs } from '@/graphql/repositories/users/schema';

async function main() {
  console.log('🗑️ Starting database reset...');

  try {
    // Reset all tables (this will clear all data)
    console.log('🧹 Resetting database tables...');
    await reset(db, {
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
