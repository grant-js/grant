#!/usr/bin/env tsx

import {
  getResourceDefinition,
  getResourceSlugs,
  ROLE_KEYS,
  GROUP_DEFINITIONS,
  PERMISSION_MAPPINGS,
  type RoleKey,
  type ResourceSlug,
  ROLES,
} from '@grantjs/constants';
import * as dotenv from 'dotenv';
import { and, eq, isNull } from 'drizzle-orm';

import { closeDatabase, initializeDBConnection } from '@/connection';
import { groupPermissions, groups, permissions, resources, roleGroups, roles } from '@/schemas';

// Load environment variables
dotenv.config();

/**
 * Permission Model Seeding Script
 *
 * Seeds the permission model from grant-constants into the database.
 * This script is idempotent - it can be run multiple times safely.
 *
 * Seeds system-wide entities:
 * - Resources (by slug)
 * - Permissions (by name + action + resourceId, including conditions)
 * - Groups (by name)
 * - Roles (by name)
 * - Role-Group associations
 * - Group-Permission associations
 *
 * Usage:
 *   pnpm db:seed:permissions              # Seed all permissions
 *   pnpm db:seed:permissions --dry-run    # Preview changes without applying
 */

interface SeedOptions {
  dryRun: boolean;
}

interface SeedResult {
  resources: { created: number; updated: number; skipped: number };
  permissions: { created: number; updated: number; skipped: number };
  groups: { created: number; updated: number; skipped: number };
  roles: { created: number; updated: number; skipped: number };
  roleGroups: { created: number; skipped: number };
  groupPermissions: { created: number; skipped: number };
}

function parseArguments(): SeedOptions {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run') || args.includes('-d'),
  };
}

export async function seedPermissions(options?: SeedOptions) {
  const seedOptions = options || parseArguments();

  console.log('🌱 Starting permission model seeding...');
  if (seedOptions.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be applied');
  }
  console.log('');

  try {
    // Initialize database connection
    const connectionString = process.env.DB_URL;
    if (!connectionString) {
      console.error('❌ Error: DB_URL environment variable is required');
      process.exit(1);
    }

    const db = initializeDBConnection({ connectionString });

    if (seedOptions.dryRun) {
      console.log('📋 DRY RUN: Would seed the following:');
      console.log('   - All resources from grant-constants');
      console.log('   - All permissions with conditions');
      console.log('   - All groups');
      console.log('   - All roles');
      console.log('   - All role-group associations');
      console.log('   - All group-permission associations');
      console.log('');
      console.log('💡 To actually seed, run without --dry-run flag');
      return;
    }

    // Run seeding in a transaction
    const result = await db.transaction(async (tx) => {
      return await seedAll(tx);
    });

    // Display results
    console.log('✅ Permission model seeding completed successfully!');
    console.log('');
    console.log('📊 Seeding Statistics:');
    console.log('');
    console.log('📦 Resources:');
    console.log(`   Created: ${result.resources.created}`);
    console.log(`   Updated: ${result.resources.updated}`);
    console.log(`   Skipped: ${result.resources.skipped}`);
    console.log('');
    console.log('🔐 Permissions:');
    console.log(`   Created: ${result.permissions.created}`);
    console.log(`   Updated: ${result.permissions.updated}`);
    console.log(`   Skipped: ${result.permissions.skipped}`);
    console.log('');
    console.log('👥 Groups:');
    console.log(`   Created: ${result.groups.created}`);
    console.log(`   Updated: ${result.groups.updated}`);
    console.log(`   Skipped: ${result.groups.skipped}`);
    console.log('');
    console.log('🎭 Roles:');
    console.log(`   Created: ${result.roles.created}`);
    console.log(`   Updated: ${result.roles.updated}`);
    console.log(`   Skipped: ${result.roles.skipped}`);
    console.log('');
    console.log('🔗 Role-Group Associations:');
    console.log(`   Created: ${result.roleGroups.created}`);
    console.log(`   Skipped: ${result.roleGroups.skipped}`);
    console.log('');
    console.log('🔗 Group-Permission Associations:');
    console.log(`   Created: ${result.groupPermissions.created}`);
    console.log(`   Skipped: ${result.groupPermissions.skipped}`);
    console.log('');
    console.log('💡 All permission model entities are now synchronized with the database.');
  } catch (error) {
    console.error('❌ Error during permission seeding:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      if (error.stack) {
        console.error('   Stack:', error.stack);
      }
    }
    process.exit(1);
  } finally {
    // Close database connection
    await closeDatabase();
  }
}

async function seedAll(db: ReturnType<typeof initializeDBConnection>): Promise<SeedResult> {
  const result: SeedResult = {
    resources: { created: 0, updated: 0, skipped: 0 },
    permissions: { created: 0, updated: 0, skipped: 0 },
    groups: { created: 0, updated: 0, skipped: 0 },
    roles: { created: 0, updated: 0, skipped: 0 },
    roleGroups: { created: 0, skipped: 0 },
    groupPermissions: { created: 0, skipped: 0 },
  };

  // Step 1: Seed resources (must be done first - permissions reference them)
  const resourceMap = await seedResources(db);
  result.resources = resourceMap.stats;

  // Step 2: Seed permissions (must be done before groups - groups reference them)
  const permissionMap = await seedPermissionsData(db, resourceMap.map);
  result.permissions = permissionMap.stats;

  // Step 3: Seed groups
  const groupMap = await seedGroups(db);
  result.groups = groupMap.stats;

  // Step 4: Seed roles
  const roleMap = await seedRoles(db);
  result.roles = roleMap.stats;

  // Step 5: Assign groups to roles
  const roleGroupStats = await seedRoleGroups(db, roleMap.map, groupMap.map);
  result.roleGroups = roleGroupStats;

  // Step 6: Assign permissions to groups
  const groupPermissionStats = await seedGroupPermissions(db, groupMap.map, permissionMap.map);
  result.groupPermissions = groupPermissionStats;

  return result;
}

async function seedResources(db: ReturnType<typeof initializeDBConnection>): Promise<{
  map: Map<ResourceSlug, typeof resources.$inferSelect>;
  stats: SeedResult['resources'];
}> {
  const map = new Map<ResourceSlug, typeof resources.$inferSelect>();
  const stats = { created: 0, updated: 0, skipped: 0 };
  const now = new Date();

  for (const slug of getResourceSlugs()) {
    const definition = getResourceDefinition(slug);

    // Find existing resource by slug (system-wide, not deleted)
    const existing = await db
      .select()
      .from(resources)
      .where(and(eq(resources.slug, slug), isNull(resources.deletedAt)))
      .limit(1);

    if (existing.length > 0) {
      const existingResource = existing[0];
      // Check if update is needed
      const needsUpdate =
        existingResource.name !== definition.name ||
        JSON.stringify(existingResource.actions) !== JSON.stringify(definition.actions) ||
        existingResource.description !== (definition.description || null);

      if (needsUpdate) {
        await db
          .update(resources)
          .set({
            name: definition.name,
            actions: definition.actions as string[],
            description: definition.description || null,
            updatedAt: now,
          })
          .where(eq(resources.id, existingResource.id));
        stats.updated++;
      } else {
        stats.skipped++;
      }
      map.set(slug, existingResource);
    } else {
      // Create new resource
      const [newResource] = await db
        .insert(resources)
        .values({
          name: definition.name,
          slug: definition.slug,
          description: definition.description || null,
          actions: definition.actions as string[],
          isActive: true,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      stats.created++;
      map.set(slug, newResource);
    }
  }

  return { map, stats };
}

async function seedPermissionsData(
  db: ReturnType<typeof initializeDBConnection>,
  resourceMap: Map<ResourceSlug, typeof resources.$inferSelect>
): Promise<{
  map: Map<string, typeof permissions.$inferSelect>;
  stats: SeedResult['permissions'];
}> {
  const map = new Map<string, typeof permissions.$inferSelect>();
  const stats = { created: 0, updated: 0, skipped: 0 };
  const now = new Date();

  // Collect all unique permissions from all groups
  const allPermissions = new Map<string, (typeof PERMISSION_MAPPINGS)[string][number]>();
  for (const [groupName, permissions] of Object.entries(PERMISSION_MAPPINGS)) {
    for (const permission of permissions) {
      const key = `${permission.resource}:${permission.action}`;
      if (!allPermissions.has(key)) {
        allPermissions.set(key, permission);
      }
    }
  }

  for (const [key, permissionMapping] of allPermissions) {
    const resource = resourceMap.get(permissionMapping.resource);
    if (!resource) {
      console.warn(`⚠️  Resource not found for permission: ${permissionMapping.resource}`);
      continue;
    }

    // Generate i18n keys for permission name and description
    // Format: permissions.{names|descriptions}.{resource}.{action}
    // Example: "permissions.names.authenticationMethod.setPrimaryUser"
    // Convert resource slug to camelCase (e.g., "user-authentication-method" -> "userAuthenticationMethod")
    const resourceCamelCase = permissionMapping.resource
      .split('-')
      .map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
      .join('');
    // Convert action to camelCase (e.g., "set-primary-user" -> "setPrimaryUser")
    const actionCamelCase = permissionMapping.action
      .split('-')
      .map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
      .join('');
    const permissionNameKey = `permissions.names.${resourceCamelCase}.${actionCamelCase}`;
    const permissionDescriptionKey = `permissions.descriptions.${resourceCamelCase}.${actionCamelCase}`;

    // Find existing permission by action and resourceId (not deleted)
    // Note: We find by action+resourceId since name might have changed
    const existing = await db
      .select()
      .from(permissions)
      .where(
        and(
          eq(permissions.action, permissionMapping.action),
          eq(permissions.resourceId, resource.id),
          isNull(permissions.deletedAt)
        )
      )
      .limit(1);

    const conditionJson = permissionMapping.condition
      ? JSON.stringify(permissionMapping.condition)
      : null;

    if (existing.length > 0) {
      const existingPermission = existing[0];
      // Check if update is needed (name, description, or condition)
      const existingConditionJson = existingPermission.condition
        ? JSON.stringify(existingPermission.condition)
        : null;
      const needsUpdate =
        existingPermission.name !== permissionNameKey ||
        existingPermission.description !== permissionDescriptionKey ||
        existingConditionJson !== conditionJson;

      if (needsUpdate) {
        await db
          .update(permissions)
          .set({
            name: permissionNameKey,
            description: permissionDescriptionKey,
            condition: permissionMapping.condition,
            updatedAt: now,
          })
          .where(eq(permissions.id, existingPermission.id));
        stats.updated++;
      } else {
        stats.skipped++;
      }
      map.set(key, existingPermission);
    } else {
      // Create new permission
      const [newPermission] = await db
        .insert(permissions)
        .values({
          name: permissionNameKey,
          description: permissionDescriptionKey,
          action: permissionMapping.action,
          resourceId: resource.id,
          condition: permissionMapping.condition,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      stats.created++;
      map.set(key, newPermission);
    }
  }

  return { map, stats };
}

async function seedGroups(db: ReturnType<typeof initializeDBConnection>): Promise<{
  map: Map<string, typeof groups.$inferSelect>;
  stats: SeedResult['groups'];
}> {
  const map = new Map<string, typeof groups.$inferSelect>();
  const stats = { created: 0, updated: 0, skipped: 0 };
  const now = new Date();

  // Iterate over object entries to get both the key (for map lookup) and definition
  for (const [groupKey, groupDefinition] of Object.entries(GROUP_DEFINITIONS)) {
    // Find existing group by i18n name (not deleted)
    const existing = await db
      .select()
      .from(groups)
      .where(and(eq(groups.name, groupDefinition.name), isNull(groups.deletedAt)))
      .limit(1);

    if (existing.length > 0) {
      const existingGroup = existing[0];
      // Check if update is needed
      const needsUpdate = existingGroup.description !== (groupDefinition.description || null);

      if (needsUpdate) {
        await db
          .update(groups)
          .set({
            description: groupDefinition.description || null,
            updatedAt: now,
          })
          .where(eq(groups.id, existingGroup.id));
        stats.updated++;
      } else {
        stats.skipped++;
      }
      // Store using the object key (e.g., 'Account Common') for lookup in associations
      map.set(groupKey, existingGroup);
    } else {
      // Create new group
      const [newGroup] = await db
        .insert(groups)
        .values({
          name: groupDefinition.name,
          description: groupDefinition.description || null,
          metadata: {},
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      stats.created++;
      // Store using the object key (e.g., 'Account Common') for lookup in associations
      map.set(groupKey, newGroup);
    }
  }

  return { map, stats };
}

async function seedRoles(db: ReturnType<typeof initializeDBConnection>): Promise<{
  map: Map<RoleKey, typeof roles.$inferSelect>;
  stats: SeedResult['roles'];
}> {
  const map = new Map<RoleKey, typeof roles.$inferSelect>();
  const stats = { created: 0, updated: 0, skipped: 0 };
  const now = new Date();

  for (const roleKey of ROLE_KEYS) {
    const roleDefinition = ROLES[roleKey];

    // Find existing role by i18n name key (what's stored in database, not deleted)
    const existing = await db
      .select()
      .from(roles)
      .where(and(eq(roles.name, roleDefinition.name), isNull(roles.deletedAt)))
      .limit(1);

    if (existing.length > 0) {
      const existingRole = existing[0];
      // Check if update is needed
      const needsUpdate = existingRole.description !== roleDefinition.description;

      if (needsUpdate) {
        await db
          .update(roles)
          .set({
            description: roleDefinition.description,
            updatedAt: now,
          })
          .where(eq(roles.id, existingRole.id));
        stats.updated++;
      } else {
        stats.skipped++;
      }
      map.set(roleKey, existingRole);
    } else {
      // Create new role with i18n keys
      const [newRole] = await db
        .insert(roles)
        .values({
          name: roleDefinition.name,
          description: roleDefinition.description,
          metadata: {},
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      stats.created++;
      map.set(roleKey, newRole);
    }
  }

  return { map, stats };
}

async function seedRoleGroups(
  db: ReturnType<typeof initializeDBConnection>,
  roleMap: Map<RoleKey, typeof roles.$inferSelect>,
  groupMap: Map<string, typeof groups.$inferSelect>
): Promise<{ created: number; skipped: number }> {
  const stats = { created: 0, skipped: 0 };
  const now = new Date();

  for (const [groupName, groupDefinition] of Object.entries(GROUP_DEFINITIONS)) {
    const group = groupMap.get(groupName);
    if (!group) {
      console.warn(`⚠️  Group not found: ${groupName}`);
      continue;
    }

    for (const roleName of groupDefinition.assignedRoles) {
      const role = roleMap.get(roleName);
      if (!role) {
        console.warn(`⚠️  Role not found: ${roleName}`);
        continue;
      }

      // Check if association already exists (not deleted)
      const existing = await db
        .select()
        .from(roleGroups)
        .where(
          and(
            eq(roleGroups.roleId, role.id),
            eq(roleGroups.groupId, group.id),
            isNull(roleGroups.deletedAt)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        await db.insert(roleGroups).values({
          roleId: role.id,
          groupId: group.id,
          createdAt: now,
          updatedAt: now,
        });
        stats.created++;
      } else {
        stats.skipped++;
      }
    }
  }

  return stats;
}

async function seedGroupPermissions(
  db: ReturnType<typeof initializeDBConnection>,
  groupMap: Map<string, typeof groups.$inferSelect>,
  permissionMap: Map<string, typeof permissions.$inferSelect>
): Promise<{ created: number; skipped: number }> {
  const stats = { created: 0, skipped: 0 };
  const now = new Date();

  for (const [groupName, permissions] of Object.entries(PERMISSION_MAPPINGS)) {
    const group = groupMap.get(groupName);
    if (!group) {
      console.warn(`⚠️  Group not found: ${groupName}`);
      continue;
    }

    for (const permissionMapping of permissions) {
      const key = `${permissionMapping.resource}:${permissionMapping.action}`;
      const permission = permissionMap.get(key);
      if (!permission) {
        console.warn(`⚠️  Permission not found: ${key}`);
        continue;
      }

      // Check if association already exists (not deleted)
      const existing = await db
        .select()
        .from(groupPermissions)
        .where(
          and(
            eq(groupPermissions.groupId, group.id),
            eq(groupPermissions.permissionId, permission.id),
            isNull(groupPermissions.deletedAt)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        await db.insert(groupPermissions).values({
          groupId: group.id,
          permissionId: permission.id,
          createdAt: now,
          updatedAt: now,
        });
        stats.created++;
      } else {
        stats.skipped++;
      }
    }
  }

  return stats;
}

// Run if called directly (not imported as a module)
if (process.argv[1]?.endsWith('seed-permissions.ts')) {
  seedPermissions();
}
