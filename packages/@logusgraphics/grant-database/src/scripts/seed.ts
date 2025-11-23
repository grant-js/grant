#!/usr/bin/env tsx

import * as dotenv from 'dotenv';
import { eq } from 'drizzle-orm';

import { closeDatabase, initializeDatabase } from '@/connection';
import { users } from '@/schemas';

// Load environment variables
dotenv.config();

/**
 * System user ID for internal operations
 * Can be configured via SYSTEM_USER_ID environment variable
 * Defaults to '00000000-0000-0000-0000-000000000000' if not set
 * This should match the system user ID configured in apps/api/.env
 */
const SYSTEM_USER_ID = process.env.SYSTEM_USER_ID || '00000000-0000-0000-0000-000000000000';

async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    // Initialize database connection
    const connectionString = process.env.DB_URL;
    if (!connectionString) {
      console.error('❌ Error: DB_URL environment variable is required');
      process.exit(1);
    }

    const db = initializeDatabase({ connectionString });

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
      console.log('   npm run db:reset');
      return;
    }

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

    console.log('✅ Database seeding completed successfully!');
    console.log('📊 Seeded data:');
    console.log(`   - System user (ID: ${SYSTEM_USER_ID})`);
    console.log('');
    console.log(
      '💡 The system user is used for internal operations like background jobs and audit logging.'
    );
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await closeDatabase();
  }
}

main();
