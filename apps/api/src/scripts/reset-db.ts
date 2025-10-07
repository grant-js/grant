#!/usr/bin/env tsx

import { db } from '@logusgraphics/grant-database';
import { groupPermissions, groupPermissionsAuditLogs } from '@logusgraphics/grant-database';
import { groupTags, groupTagsAuditLogs } from '@logusgraphics/grant-database';
import { groupAuditLogs, groups } from '@logusgraphics/grant-database';
import { organizationGroups, organizationGroupsAuditLogs } from '@logusgraphics/grant-database';
import {
  organizationPermissions,
  organizationPermissionsAuditLogs,
} from '@logusgraphics/grant-database';
import { organizationProjects, organizationProjectsAuditLogs } from '@logusgraphics/grant-database';
import { organizationRoles, organizationRolesAuditLogs } from '@logusgraphics/grant-database';
import { organizationTagAuditLogs, organizationTags } from '@logusgraphics/grant-database';
import { organizationUsers, organizationUsersAuditLogs } from '@logusgraphics/grant-database';
import { organizationAuditLogs, organizations } from '@logusgraphics/grant-database';
import { permissionTagAuditLogs, permissionTags } from '@logusgraphics/grant-database';
import { permissionAuditLogs, permissions } from '@logusgraphics/grant-database';
import { projectGroupAuditLogs, projectGroups } from '@logusgraphics/grant-database';
import { projectPermissions, projectPermissionsAuditLogs } from '@logusgraphics/grant-database';
import { projectRoleAuditLogs, projectRoles } from '@logusgraphics/grant-database';
import { projectTagAuditLogs, projectTags } from '@logusgraphics/grant-database';
import { projectUserAuditLogs, projectUsers } from '@logusgraphics/grant-database';
import { projectAuditLogs, projects } from '@logusgraphics/grant-database';
import { roleGroups, roleGroupsAuditLogs } from '@logusgraphics/grant-database';
import { roleTagAuditLogs, roleTags } from '@logusgraphics/grant-database';
import { roleAuditLogs, roles } from '@logusgraphics/grant-database';
import { tagAuditLogs, tags } from '@logusgraphics/grant-database';
import { userRoles, userRolesAuditLogs } from '@logusgraphics/grant-database';
import { userTags, userTagsAuditLogs } from '@logusgraphics/grant-database';
import { users, userAuditLogs } from '@logusgraphics/grant-database';
import { reset } from 'drizzle-seed';

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
