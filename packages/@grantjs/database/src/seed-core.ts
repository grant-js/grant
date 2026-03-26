import crypto from 'node:crypto';

import { and, eq } from 'drizzle-orm';

import type { DbSchema } from './connection';
import { signingKeys, users } from './schemas';

const SYSTEM_SCOPE_TENANT = 'system';

export async function ensureSystemUser(db: DbSchema, systemUserId: string): Promise<void> {
  const existingSystemUser = await db
    .select()
    .from(users)
    .where(eq(users.id, systemUserId))
    .limit(1);
  if (existingSystemUser.length > 0) return;

  const now = new Date();
  await db.insert(users).values({
    id: systemUserId,
    name: 'System',
    pictureUrl: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  });
}

export async function ensureSystemSigningKey(db: DbSchema, systemUserId: string): Promise<void> {
  const existingKey = await db
    .select()
    .from(signingKeys)
    .where(
      and(
        eq(signingKeys.scopeTenant, SYSTEM_SCOPE_TENANT),
        eq(signingKeys.scopeId, systemUserId),
        eq(signingKeys.active, true)
      )
    )
    .limit(1);

  if (existingKey.length > 0) return;

  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const kid = `system-${crypto.randomUUID()}`;
  await db.insert(signingKeys).values({
    scopeTenant: SYSTEM_SCOPE_TENANT,
    scopeId: systemUserId,
    kid,
    publicKeyPem: publicKey,
    privateKeyPem: privateKey,
    algorithm: 'RS256',
    active: true,
  });
}

export async function ensureSystemUserAndSigningKey(
  db: DbSchema,
  systemUserId: string
): Promise<void> {
  await ensureSystemUser(db, systemUserId);
  await ensureSystemSigningKey(db, systemUserId);
}
