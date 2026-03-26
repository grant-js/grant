#!/usr/bin/env tsx

import { getEnv, resolveDatabaseUrl } from '@grantjs/env';
import { eq } from 'drizzle-orm';

import { closeDatabase, initializeDBConnection } from '@/connection';
import { users } from '@/schemas';

import { ensureSystemSigningKey } from '../seed-core';

/**
 * System User Seeding Script
 *
 * Seeds the system user required for internal operations.
 * This script is idempotent - it can be run multiple times safely.
 *
 * Usage:
 *   pnpm db:seed:system-user    # Seed system user
 */

const env = getEnv();

/** System user ID for internal operations (configurable via SYSTEM_USER_ID) */
const SYSTEM_USER_ID = env.SYSTEM_USER_ID;

export async function seedSystemUser() {
  console.log('🌱 Starting system user seeding...');

  try {
    // Initialize database connection
    const connectionString = resolveDatabaseUrl(env);
    if (!connectionString) {
      console.error('❌ Error: DB_URL or POSTGRES_* environment variables are required');
      process.exit(1);
    }

    const db = initializeDBConnection({ connectionString });

    // Check if system user already exists
    const existingSystemUser = await db
      .select()
      .from(users)
      .where(eq(users.id, SYSTEM_USER_ID))
      .limit(1);

    if (existingSystemUser.length > 0) {
      console.log('⚠️  System user already exists!');
      console.log(`   ID: ${SYSTEM_USER_ID}`);
      console.log(`   Name: ${existingSystemUser[0].name}`);
      console.log('');
      console.log('💡 To seed fresh data, first reset the database:');
      console.log('   pnpm db:reset');
    } else {
      // Insert system user
      console.log('📝 Seeding system user...');
      const now = new Date();
      await db.insert(users).values({
        id: SYSTEM_USER_ID,
        name: 'System',
        pictureUrl: null,
        deletedAt: null,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Always ensure system signing key exists (for session/JWKS)
    await ensureSystemSigningKey(db, SYSTEM_USER_ID);

    console.log('✅ System user seeding completed successfully!');
    console.log('📊 Seeded data:');
    console.log(`   - System user (ID: ${SYSTEM_USER_ID})`);
    console.log('   - System signing key (scope: system)');
    console.log('');
    console.log(
      '💡 The system user is used for internal operations like background jobs and audit logging.'
    );
  } catch (error) {
    console.error('❌ Error during system user seeding:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await closeDatabase();
  }
}

// Run if called directly (not imported as a module)
if (process.argv[1]?.endsWith('seed-system-user.ts')) {
  seedSystemUser();
}
