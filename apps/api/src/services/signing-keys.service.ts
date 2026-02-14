import crypto from 'node:crypto';

import { ConfigurationError } from '@grantjs/core';
import { SigningKey, Tenant, type Scope } from '@grantjs/schema';

import { generateUUID } from '@/lib/token.lib';
import { Transaction } from '@/lib/transaction-manager.lib';

import type { IAuditLogger, ISigningKeyRepository, ISigningKeyService } from '@grantjs/core';

export interface SigningKeyResult {
  kid: string;
  privateKeyPem: string;
}

/**
 * Extended signing-key shape that includes the private-key PEM.
 * The schema `SigningKey` type intentionally omits private material;
 * the concrete repository still returns it at runtime.
 */
interface SigningKeyWithPrivate extends SigningKey {
  privateKeyPem: string;
}

export class SigningKeyService implements ISigningKeyService {
  constructor(
    private readonly signingKeyRepository: ISigningKeyRepository,
    private readonly audit: IAuditLogger
  ) {}

  private kidPrefix(tenant: Tenant): string {
    switch (tenant) {
      case Tenant.AccountProject:
        return 'acc-prj-';
      case Tenant.OrganizationProject:
        return 'org-prj-';
      case Tenant.ProjectUser:
        return 'prj-usr-';
      case Tenant.System:
      default:
        return 'sys-';
    }
  }

  private auditSafeKeyFields(row: SigningKey): Record<string, unknown> {
    return {
      kid: row.kid,
      active: row.active,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt ?? null,
      rotatedAt: row.rotatedAt ?? null,
    };
  }

  async getOrCreateForScope(scope: Scope, transaction?: Transaction): Promise<SigningKeyResult> {
    const existing = (await this.signingKeyRepository.getByScope(
      scope.tenant,
      scope.id,
      transaction
    )) as SigningKeyWithPrivate | null;
    if (existing) {
      return { kid: existing.kid, privateKeyPem: existing.privateKeyPem };
    }

    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const kid = `${this.kidPrefix(scope.tenant)}${generateUUID()}`;
    const newKey = await this.signingKeyRepository.createSigningKey(
      {
        scopeTenant: scope.tenant,
        scopeId: scope.id,
        kid,
        publicKeyPem: publicKey,
        privateKeyPem: privateKey,
        algorithm: 'RS256',
        active: true,
      },
      transaction
    );

    await this.audit.logCreate(
      newKey.id,
      this.auditSafeKeyFields(newKey),
      { scopeTenant: scope.tenant, scopeId: scope.id },
      transaction
    );

    return { kid, privateKeyPem: privateKey };
  }

  async getPublicKeyPemByKid(kid: string, transaction?: Transaction): Promise<string | null> {
    return this.signingKeyRepository.getPublicKeyPemByKid(kid, transaction);
  }

  async getActivePublicKeys(
    transaction?: Transaction
  ): Promise<Array<{ kid: string; publicKeyPem: string }>> {
    return this.signingKeyRepository.getActivePublicKeys(transaction);
  }

  async getPublicKeysForJwks(
    retentionCutoff: Date,
    transaction?: Transaction
  ): Promise<Array<{ kid: string; publicKeyPem: string }>> {
    return this.signingKeyRepository.getPublicKeysForJwks(retentionCutoff, transaction);
  }

  async getPublicKeysForJwksByScope(
    scopeTenant: string,
    scopeId: string,
    retentionCutoff: Date,
    transaction?: Transaction
  ): Promise<Array<{ kid: string; publicKeyPem: string }>> {
    return this.signingKeyRepository.getPublicKeysForJwksByScope(
      scopeTenant,
      scopeId,
      retentionCutoff,
      transaction
    );
  }

  async listByScope(
    scope: Scope,
    options?: { limit?: number },
    transaction?: Transaction
  ): Promise<SigningKey[]> {
    return this.signingKeyRepository.listByScope(scope.tenant, scope.id, options, transaction);
  }

  async rotateForScope(scope: Scope, transaction?: Transaction): Promise<SigningKey> {
    const current = await this.signingKeyRepository.getByScope(scope.tenant, scope.id, transaction);

    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const kid = `${this.kidPrefix(scope.tenant)}${generateUUID()}`;
    const now = new Date();

    const newKey = await this.signingKeyRepository.createSigningKey(
      {
        scopeTenant: scope.tenant,
        scopeId: scope.id,
        kid,
        publicKeyPem: publicKey,
        privateKeyPem: privateKey,
        algorithm: 'RS256',
        active: true,
      },
      transaction
    );

    await this.audit.logCreate(
      newKey.id,
      this.auditSafeKeyFields(newKey),
      { scopeTenant: scope.tenant, scopeId: scope.id },
      transaction
    );

    if (current) {
      await this.signingKeyRepository.updateSigningKey(
        current.id,
        { active: false, rotatedAt: now },
        transaction
      );

      await this.audit.logAction(
        {
          entityId: current.id,
          action: 'ROTATE',
          oldValues: this.auditSafeKeyFields(current),
          newValues: { active: false, rotatedAt: now },
          metadata: { scopeTenant: scope.tenant, scopeId: scope.id, replacedByKid: kid },
        },
        transaction
      );
    }

    const rows = await this.signingKeyRepository.listByScope(
      scope.tenant,
      scope.id,
      { limit: 1 },
      transaction
    );
    const key = rows[0];
    if (!key) {
      throw new ConfigurationError('Failed to create new signing key during rotation');
    }

    return key;
  }
}
