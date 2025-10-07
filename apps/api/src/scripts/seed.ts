#!/usr/bin/env tsx

import { db } from '@logusgraphics/grant-database';
import * as roleSchema from '@logusgraphics/grant-database';
import * as userSchema from '@logusgraphics/grant-database';
import { seed } from 'drizzle-seed';

async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    // Check if data already exists
    const existingUsers = await db.select().from(userSchema.users).limit(1);
    const existingRoles = await db.select().from(roleSchema.roles).limit(1);

    if (existingUsers.length > 0 || existingRoles.length > 0) {
      console.log('⚠️  Database already contains data!');
      console.log('💡 To seed fresh data, first reset the database:');
      console.log('   npm run db:reset');
      console.log('');
      console.log('💡 Or import from existing JSON files:');
      console.log('   npm run db:seed:json');
      return;
    }

    // Seed users first (no dependencies)
    console.log('📝 Seeding users...');
    await seed(db, { users: userSchema.users }).refine((f) => ({
      users: {
        count: 50,
        columns: {
          name: f.fullName(),
          email: f.email(),
          createdAt: f.date({ minDate: '2024-01-01', maxDate: '2025-01-01' }),
          updatedAt: f.date({ minDate: '2024-01-01', maxDate: '2025-01-01' }),
        },
      },
    }));

    // Seed roles
    console.log('🎭 Seeding roles...');
    await seed(db, { roles: roleSchema.roles }).refine((f) => ({
      roles: {
        count: 10,
        columns: {
          name: f.valuesFromArray({
            values: [
              'Admin',
              'User',
              'Manager',
              'Editor',
              'Viewer',
              'Developer',
              'Designer',
              'Analyst',
              'Support',
              'Guest',
            ],
          }),
          description: f.loremIpsum({ sentencesCount: 2 }),
          createdAt: f.date({ minDate: '2024-01-01', maxDate: '2025-01-01' }),
          updatedAt: f.date({ minDate: '2024-01-01', maxDate: '2025-01-01' }),
        },
      },
    }));

    console.log('✅ Database seeding completed successfully!');
    console.log('📊 Seeded data:');
    console.log('   - 50 users');
    console.log('   - 10 roles');
    console.log('');
    console.log('💡 Note: User-role relationships are not seeded due to foreign key constraints.');
    console.log('   Use npm run db:seed:json to import existing relationships from JSON files.');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
}

main();
