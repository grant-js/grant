#!/usr/bin/env tsx

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Main Database Seeding Script
 *
 * Orchestrates all database seeding operations.
 * This script runs all seed scripts in the correct order.
 *
 * Usage:
 *   pnpm db:seed              # Seed all data
 *   pnpm db:seed --permissions # Seed only permissions
 *   pnpm db:seed --system-user # Seed only system user
 */

interface SeedOptions {
  permissions: boolean;
  systemUser: boolean;
}

function parseArguments(): SeedOptions {
  const args = process.argv.slice(2);
  const hasFlags = args.includes('--permissions') || args.includes('--system-user');

  return {
    permissions: args.includes('--permissions') || (!hasFlags && true),
    systemUser: args.includes('--system-user') || (!hasFlags && true),
  };
}

async function main() {
  const options = parseArguments();

  console.log('🌱 Starting database seeding...');
  console.log('');
  console.log('📋 Seeding plan:');
  if (options.systemUser) {
    console.log('   ✓ System user');
  }
  if (options.permissions) {
    console.log('   ✓ Permission model');
  }
  console.log('');

  try {
    // Step 1: Seed system user (must be done first)
    if (options.systemUser) {
      const { seedSystemUser } = await import('./seed-system-user.js');
      await seedSystemUser();
    }

    // Step 2: Seed permission model
    if (options.permissions) {
      const { seedPermissions } = await import('./seed-permissions.js');
      await seedPermissions();
    }

    console.log('');
    console.log('✅ All database seeding completed successfully!');
  } catch (error) {
    console.error('');
    console.error('❌ Error during database seeding:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
    }
    process.exit(1);
  }
}

main();
