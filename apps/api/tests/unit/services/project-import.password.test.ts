/**
 * CDM import of bcrypt password hashes (ADR 0010), end to end below the transport.
 *
 * The real `ProjectImportService` with the default entity registry runs against an
 * in-memory credential store, and that store is also what the real
 * `UserAuthenticationMethodService` and the real `AuthHandler.login` read, so what is
 * asserted is the thing that matters: the hash an import writes is the hash platform login
 * verifies, and a password set in Grant is not an import's to overwrite.
 */
import {
  AccountType,
  CdmFindBy,
  CdmModeStrategy,
  CdmPasswordAlgorithm,
  type Scope,
  Tenant,
  UserAuthenticationEmailProviderAction,
  UserAuthenticationMethodProvider,
} from '@grantjs/schema';
import { genSaltSync, hashSync } from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CDM_IMPORT_METADATA_KEY,
  PASSWORD_SOURCE_CDM_IMPORT,
  PASSWORD_SOURCE_PROVIDER_DATA_KEY,
} from '@/constants/cdm-import.constants';
import { AuthHandler } from '@/handlers/auth.handler';
import type { CdmDocumentInput } from '@/lib/cdm/cdm-document.schemas';
import { AuthenticationError } from '@/lib/errors';
import { ProjectImportService } from '@/services/project-import.service';
import { UserAuthenticationMethodService } from '@/services/user-authentication-methods.service';

const accountId = '10000000-0000-4000-8000-000000000020';
const projectId = '10000000-0000-4000-8000-000000000011';
const otherProjectId = '10000000-0000-4000-8000-000000000012';
const scope: Scope = { tenant: Tenant.AccountProject, id: `${accountId}:${projectId}` };
const otherScope: Scope = {
  tenant: Tenant.AccountProject,
  id: `${accountId}:${otherProjectId}`,
};
const tx = {};

/** `bcrypt.GenerateFromPassword([]byte("Legacy-Passw0rd!"), bcrypt.DefaultCost)` from Go's x/crypto. */
const GO_PASSWORD = 'Legacy-Passw0rd!';
const GO_HASH = '$2a$10$NnYC771KbJNAJLrrFr5PD.A0KJg1eS9vxvLCiZyJ2WYfW6tAS6tzG';

const NODE_PASSWORD = 'Another-Passw0rd#';
const NODE_HASH = hashSync(NODE_PASSWORD, genSaltSync(10, 'a'));

const EMAIL = 'ada@example.test';

interface MethodRow {
  id: string;
  userId: string;
  provider: UserAuthenticationMethodProvider;
  providerId: string;
  providerData: Record<string, unknown>;
  isVerified: boolean;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: null;
}

function loose<T extends object>(defaults: Partial<Record<keyof T, unknown>> = {}): T {
  const cache = new Map<string | symbol, unknown>();
  return new Proxy({} as T, {
    get: (_target, prop) => {
      if (prop === 'then') return undefined;
      if (!cache.has(prop)) {
        cache.set(
          prop,
          vi.fn().mockResolvedValue((defaults as Record<string | symbol, unknown>)[prop] ?? [])
        );
      }
      return cache.get(prop);
    },
    ownKeys: () => [...cache.keys()].filter((key): key is string => typeof key === 'string'),
    getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
  });
}

class World {
  methods: MethodRow[] = [];
  users = new Map<string, { id: string; name: string; metadata: Record<string, unknown> }>();
  calls = { createUser: [] as unknown[], create: [] as unknown[], update: [] as unknown[] };
  private seq = 0;

  private id(prefix: string): string {
    this.seq += 1;
    return `${prefix}0000000-0000-4000-8000-${String(this.seq).padStart(12, '0')}`;
  }

  seedMethod(row: Partial<MethodRow> & { providerId: string }, cdmProjectId?: string): MethodRow {
    const userId = row.userId ?? this.id('9');
    if (cdmProjectId) {
      this.users.set(userId, {
        id: userId,
        name: 'Seeded',
        metadata: {
          [CDM_IMPORT_METADATA_KEY]: {
            projectId: cdmProjectId,
            kind: 'user',
            externalKey: row.providerId,
          },
        },
      });
    }
    const method: MethodRow = {
      id: this.id('8'),
      userId,
      provider: UserAuthenticationMethodProvider.Email,
      providerData: {},
      isVerified: false,
      isPrimary: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      ...row,
    };
    this.methods.push(method);
    return method;
  }

  get email(): MethodRow {
    const m = this.methods.find((x) => x.providerId === EMAIL);
    if (!m) throw new Error('no email method');
    return m;
  }

  readonly repository = {
    getUserAuthenticationMethods: vi.fn(async (params: { userId?: string; provider?: string }) =>
      this.methods.filter(
        (m) =>
          (params.userId === undefined || m.userId === params.userId) &&
          (params.provider === undefined || m.provider === params.provider)
      )
    ),
    findByEmail: vi.fn(async (email: string) => {
      const n = email.trim().toLowerCase();
      return (
        this.methods.find(
          (m) => m.provider === UserAuthenticationMethodProvider.Email && m.providerId === n
        ) ??
        // The real lookup falls back to the email an OAuth provider reported.
        this.methods.find((m) => m.providerData.email === n) ??
        null
      );
    }),
    getUserAuthenticationMethod: vi.fn(
      async (id: string) => this.methods.find((m) => m.id === id) ?? null
    ),
    findByProviderAndProviderId: vi.fn(
      async (provider: string, providerId: string) =>
        this.methods.find((m) => m.provider === provider && m.providerId === providerId) ?? null
    ),
    createUserAuthenticationMethod: vi.fn(async (params: Partial<MethodRow>) => {
      this.calls.create.push(JSON.parse(JSON.stringify(params)));
      const row: MethodRow = {
        id: this.id('8'),
        userId: params.userId!,
        provider: params.provider!,
        providerId: params.providerId!,
        providerData: params.providerData ?? {},
        isVerified: params.isVerified ?? false,
        isPrimary: params.isPrimary ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      this.methods.push(row);
      return row;
    }),
    updateUserAuthenticationMethod: vi.fn(
      async (id: string, input: Partial<Pick<MethodRow, 'providerData' | 'isVerified'>>) => {
        this.calls.update.push({ id, input: JSON.parse(JSON.stringify(input)) });
        const row = this.methods.find((m) => m.id === id)!;
        if (input.providerData !== undefined && input.providerData !== null) {
          row.providerData = { ...input.providerData };
        }
        if (input.isVerified !== undefined && input.isVerified !== null) {
          row.isVerified = input.isVerified;
        }
        return row;
      }
    ),
  };

  readonly usersService = {
    createUser: vi.fn(async (input: { name: string; metadata: Record<string, unknown> }) => {
      this.calls.createUser.push(JSON.parse(JSON.stringify(input)));
      const id = this.id('7');
      this.users.set(id, { id, name: input.name, metadata: input.metadata });
      return { id };
    }),
  };

  readonly userRepository = {
    findUserIdByCdmImport: vi.fn(
      async (p: { projectId: string; kind: string; externalKey: string }) => {
        for (const u of this.users.values()) {
          const cdm = u.metadata[CDM_IMPORT_METADATA_KEY] as
            { projectId: string; kind: string; externalKey: string } | undefined;
          if (
            cdm &&
            cdm.projectId === p.projectId &&
            cdm.kind === p.kind &&
            cdm.externalKey === p.externalKey
          ) {
            return u.id;
          }
        }
        return null;
      }
    ),
  };

  readonly authService = new UserAuthenticationMethodService(
    this.repository as never,
    {} as never,
    {
      logCreate: vi.fn(),
      logUpdate: vi.fn(),
      logSoftDelete: vi.fn(),
      logHardDelete: vi.fn(),
      logAction: vi.fn(),
    } as never,
    { publish: vi.fn() } as never
  );

  readonly importRepo = loose({ resolvePermission: { id: 'p', resourceId: 'r' } });

  importService(): ProjectImportService {
    const importRepo = this.importRepo;
    const cache = {
      permissions: { delete: vi.fn(), keys: vi.fn().mockResolvedValue([]) },
      roles: { delete: vi.fn() },
      groups: { delete: vi.fn() },
      users: { delete: vi.fn() },
      resources: { delete: vi.fn() },
      tags: { delete: vi.fn() },
      apiKeys: { delete: vi.fn() },
    };
    const l = () => loose<never>();
    return new ProjectImportService(
      importRepo as never,
      l(), // roles
      l(), // groups
      l(), // roleGroups
      l(), // rolePermissions
      l(), // groupPermissions
      l(), // userPermissions
      l(), // userGroups
      l(), // projectRoles
      l(), // projectGroups
      l(), // projectPermissions
      l(), // projectRolePermissions
      l(), // projectUserPermissions
      l(), // projectUserGroups
      l(), // projectResources
      loose({ getProjectUsers: [] }) as never, // projectUsers
      l(), // userRoles
      l(), // apiKeys
      l(), // projectUserApiKeys
      cache as never,
      l(), // tags
      l(), // projectTags
      l(), // roleTags
      l(), // groupTags
      l(), // userTags
      l(), // resources
      l(), // permissions
      this.usersService as never,
      this.authService as never,
      this.userRepository as never,
      l(), // resourceTags
      l() // permissionTags
    );
  }

  async runImport(
    users: CdmDocumentInput['users'],
    options: { strategy?: CdmModeStrategy; scope?: Scope } = {}
  ) {
    const strategy = options.strategy ?? CdmModeStrategy.Merge;
    const useScope = options.scope ?? scope;
    const input: CdmDocumentInput = {
      version: 1,
      id: null,
      mode: {
        strategy,
        onConflict: null,
        confirmDestructive: strategy === CdmModeStrategy.Replace,
      },
      roles: [],
      users,
    };
    return this.importService().importProjectCdm(
      { projectId: useScope.id.split(':')[1], scope: useScope, input },
      tx
    );
  }
}

function userWithPassword(hash: string | null, email = EMAIL): CdmDocumentInput['users'][number] {
  return {
    key: { value: email, findBy: CdmFindBy.Email },
    name: 'Ada Lovelace',
    ...(hash === null ? {} : { password: { algorithm: CdmPasswordAlgorithm.Bcrypt, hash } }),
  };
}

const counters = (r: Awaited<ReturnType<World['runImport']>>) => ({
  imported: r.passwordsImported,
  updated: r.passwordsUpdated,
  unchanged: r.passwordsUnchanged,
  skipped: r.passwordsSkippedExisting,
});

async function loginWith(world: World, email: string, password: string) {
  const mockUsers = {
    getUsers: vi.fn().mockResolvedValue({
      totalCount: 1,
      users: [
        { id: world.email.userId, accounts: [{ id: 'account-1', type: AccountType.Personal }] },
      ],
    }),
    createUser: vi.fn(),
    countHumanUsers: vi.fn(),
  };
  const mockUserSessions = {
    getUserSessions: vi.fn().mockResolvedValue({ userSessions: [] }),
    createSession: vi.fn().mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh' }),
    refreshSessionLastUsed: vi.fn(),
    signSession: vi.fn(),
  };
  const handler = new AuthHandler(
    world.authService as never,
    mockUsers as never,
    {} as never,
    {} as never,
    {} as never,
    { hasActiveMfaEnrollment: vi.fn().mockResolvedValue(false) } as never,
    mockUserSessions as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    { withTransaction: (fn: (t: unknown) => unknown) => fn(tx) } as never
  );
  return handler.login({
    input: {
      provider: UserAuthenticationMethodProvider.Email,
      providerId: email,
      providerData: { password, action: UserAuthenticationEmailProviderAction.Login },
    },
  });
}

describe('CDM import of bcrypt password hashes (ADR 0010)', () => {
  let world: World;

  beforeEach(() => {
    vi.clearAllMocks();
    world = new World();
  });

  describe('first import', () => {
    it('stores the hash where platform login reads it, marked as imported, and login succeeds with the original plaintext', async () => {
      const result = await world.runImport([userWithPassword(GO_HASH)]);

      expect(counters(result)).toEqual({ imported: 1, updated: 0, unchanged: 0, skipped: 0 });
      expect(world.email.providerData).toEqual({
        hashedPassword: GO_HASH,
        [PASSWORD_SOURCE_PROVIDER_DATA_KEY]: PASSWORD_SOURCE_CDM_IMPORT,
      });
      expect(world.email.isVerified).toBe(false);

      // The Go-generated `$2a$10$` hash verifies with node bcrypt through the unchanged login.
      const session = await loginWith(world, EMAIL, GO_PASSWORD);
      expect(session.accessToken).toBe('access');
      expect(session.requiresEmailVerification).toBe(true);

      await expect(loginWith(world, EMAIL, `${GO_PASSWORD}x`)).rejects.toBeInstanceOf(
        AuthenticationError
      );
    });

    it('accepts a node-generated $2a$ hash the same way', async () => {
      expect(NODE_HASH.startsWith('$2a$10$')).toBe(true);
      await world.runImport([userWithPassword(NODE_HASH)]);

      const session = await loginWith(world, EMAIL, NODE_PASSWORD);
      expect(session.accessToken).toBe('access');
    });

    it('creates a passwordless identity when the document carries no password', async () => {
      const result = await world.runImport([userWithPassword(null)]);

      expect(counters(result)).toEqual({ imported: 0, updated: 0, unchanged: 0, skipped: 0 });
      expect(world.email.providerData).toEqual({});
      await expect(loginWith(world, EMAIL, GO_PASSWORD)).rejects.toBeInstanceOf(
        AuthenticationError
      );
    });

    it('writes the hash to the credential store and nowhere else', async () => {
      const result = await world.runImport([
        { ...userWithPassword(GO_HASH), metadata: { legacy: { id: '7' } }, searchable: { n: 1 } },
      ]);

      const elsewhere = JSON.stringify({
        createUser: world.calls.createUser,
        userMetadata: [...world.users.values()],
        warnings: result.warnings,
        result,
      });
      expect(elsewhere).not.toContain(GO_HASH);
      // The one place it is: the create call for the email method (never audited with it).
      expect(JSON.stringify(world.calls.create)).toContain(GO_HASH);
    });
  });

  describe('re-import', () => {
    it('leaves an identical hash alone', async () => {
      await world.runImport([userWithPassword(GO_HASH)]);
      world.calls.update.length = 0;

      const result = await world.runImport([userWithPassword(GO_HASH)]);

      expect(counters(result)).toEqual({ imported: 0, updated: 0, unchanged: 1, skipped: 0 });
      expect(world.calls.update).toEqual([]);
    });

    it('replaces an imported credential when the legacy hash changed', async () => {
      await world.runImport([userWithPassword(GO_HASH)]);

      const result = await world.runImport([userWithPassword(NODE_HASH)]);

      expect(counters(result)).toEqual({ imported: 0, updated: 1, unchanged: 0, skipped: 0 });
      expect(world.email.providerData).toEqual({
        hashedPassword: NODE_HASH,
        [PASSWORD_SOURCE_PROVIDER_DATA_KEY]: PASSWORD_SOURCE_CDM_IMPORT,
      });
      expect((await loginWith(world, EMAIL, NODE_PASSWORD)).accessToken).toBe('access');
      await expect(loginWith(world, EMAIL, GO_PASSWORD)).rejects.toBeInstanceOf(
        AuthenticationError
      );
    });

    it('adds a credential to an identity an earlier import of this project created without one', async () => {
      await world.runImport([userWithPassword(null)]);

      const result = await world.runImport([userWithPassword(GO_HASH)]);

      expect(counters(result)).toEqual({ imported: 1, updated: 0, unchanged: 0, skipped: 0 });
      expect((await loginWith(world, EMAIL, GO_PASSWORD)).accessToken).toBe('access');
    });

    it('never deletes a credential: an absent password field leaves it as it is', async () => {
      await world.runImport([userWithPassword(GO_HASH)]);
      world.calls.update.length = 0;

      const result = await world.runImport([userWithPassword(null)]);

      expect(counters(result)).toEqual({ imported: 0, updated: 0, unchanged: 0, skipped: 0 });
      expect(world.calls.update).toEqual([]);
      expect(world.email.providerData.hashedPassword).toBe(GO_HASH);
    });
  });

  describe('a password set in Grant is Grant-owned from then on', () => {
    async function importedThen(change: (w: World, userId: string) => Promise<void>) {
      await world.runImport([userWithPassword(GO_HASH)]);
      const { userId } = world.email;
      await change(world, userId);
      const afterChange = { ...world.email.providerData };

      const result = await world.runImport([userWithPassword(NODE_HASH)]);

      expect(counters(result)).toEqual({ imported: 0, updated: 0, unchanged: 0, skipped: 1 });
      expect(world.email.providerData).toEqual(afterChange);
      expect(world.email.providerData.hashedPassword).not.toBe(NODE_HASH);
      expect(result.warnings.join('\n')).not.toContain(NODE_HASH);
    }

    it('changePassword clears the marker, and the next import does not overwrite', async () => {
      await importedThen(async (w, userId) => {
        await w.authService.changePassword(userId, GO_PASSWORD, 'Grant-Side-Passw0rd!');
        expect(w.email.providerData[PASSWORD_SOURCE_PROVIDER_DATA_KEY]).toBeUndefined();
        expect(w.email.providerData.hashedPassword).not.toBe(GO_HASH);
      });
    });

    it('resetPassword clears the marker, and the next import does not overwrite', async () => {
      await importedThen(async (w) => {
        w.email.providerData = {
          ...w.email.providerData,
          passwordResetOtp: { token: 'reset-token', validUntil: Date.now() + 60_000 },
        };
        const reset = await w.authService.resetPassword('reset-token', 'Reset-Passw0rd!');
        expect(reset).toBe(w.email.userId);
        expect(w.email.providerData[PASSWORD_SOURCE_PROVIDER_DATA_KEY]).toBeUndefined();
      });
    });

    it('a password with no marker (set in Grant before any import) is never overwritten', async () => {
      world.seedMethod(
        {
          providerId: EMAIL,
          providerData: { hashedPassword: hashSync('Grant-Passw0rd!', 4) },
        },
        projectId
      );
      const before = { ...world.email.providerData };

      const result = await world.runImport([userWithPassword(GO_HASH)]);

      expect(counters(result)).toEqual({ imported: 0, updated: 0, unchanged: 0, skipped: 1 });
      expect(world.email.providerData).toEqual(before);
    });
  });

  describe('replace mode', () => {
    it('keeps the credential of a user it re-creates, and tears down no authentication method', async () => {
      await world.runImport([userWithPassword(GO_HASH)]);
      world.calls.update.length = 0;
      world.calls.create.length = 0;

      const same = await world.runImport([userWithPassword(GO_HASH)], {
        strategy: CdmModeStrategy.Replace,
      });
      const absent = await world.runImport([userWithPassword(null)], {
        strategy: CdmModeStrategy.Replace,
      });
      const dropped = await world.runImport([], { strategy: CdmModeStrategy.Replace });

      expect(counters(same)).toEqual({ imported: 0, updated: 0, unchanged: 1, skipped: 0 });
      expect(counters(absent)).toEqual({ imported: 0, updated: 0, unchanged: 0, skipped: 0 });
      expect(counters(dropped)).toEqual({ imported: 0, updated: 0, unchanged: 0, skipped: 0 });
      expect(world.calls.update).toEqual([]);
      expect(world.calls.create).toEqual([]);
      expect(world.methods).toHaveLength(1);
      // The replace teardown ran (it asked the repository what to remove) and none of what it
      // asked about is a user or an authentication method.
      const teardownCalls = Object.keys(world.importRepo as object).length;
      expect(teardownCalls).toBeGreaterThan(0);
      expect(
        Object.keys(world.importRepo as object).filter((name) =>
          /user(?!.*(Tag|Group|Permission|ApiKey|Role))|authentication/i.test(name)
        )
      ).toEqual([]);
      expect(world.email.providerData.hashedPassword).toBe(GO_HASH);
      expect((await loginWith(world, EMAIL, GO_PASSWORD)).accessToken).toBe('access');
    });

    it('can still replace an imported credential with a changed hash', async () => {
      await world.runImport([userWithPassword(GO_HASH)]);

      const result = await world.runImport([userWithPassword(NODE_HASH)], {
        strategy: CdmModeStrategy.Replace,
      });

      expect(counters(result)).toEqual({ imported: 0, updated: 1, unchanged: 0, skipped: 0 });
    });
  });

  describe('identities that are not this import to write', () => {
    it('does not put a password on a user who registered in Grant (verified, passwordless)', async () => {
      world.seedMethod({ providerId: EMAIL, isVerified: true });

      const result = await world.runImport([userWithPassword(GO_HASH)]);

      expect(counters(result)).toEqual({ imported: 0, updated: 0, unchanged: 0, skipped: 1 });
      expect(world.email.providerData).toEqual({});
      expect(result.warnings.join('\n')).toMatch(/passwordsSkippedExisting/);
      expect(result.warnings.join('\n')).not.toContain(EMAIL);
    });

    it('does not put a password on an unverified passwordless user that no import of this project created', async () => {
      world.seedMethod({ providerId: EMAIL, isVerified: false });

      const result = await world.runImport([userWithPassword(GO_HASH)]);

      expect(counters(result)).toEqual({ imported: 0, updated: 0, unchanged: 0, skipped: 1 });
      expect(world.email.providerData).toEqual({});
    });

    it('does not put a password on an identity provisioned by another project', async () => {
      world.seedMethod({ providerId: EMAIL, isVerified: false }, otherProjectId);

      const result = await world.runImport([userWithPassword(GO_HASH)]);

      expect(counters(result)).toEqual({ imported: 0, updated: 0, unchanged: 0, skipped: 1 });
      expect(world.email.providerData).toEqual({});
    });

    it("does not replace another project's imported credential", async () => {
      await world.runImport([userWithPassword(GO_HASH)], { scope: otherScope });

      const result = await world.runImport([userWithPassword(NODE_HASH)]);

      expect(counters(result)).toEqual({ imported: 0, updated: 0, unchanged: 0, skipped: 1 });
      expect(world.email.providerData.hashedPassword).toBe(GO_HASH);
    });

    it('does not put a password on a user known only through GitHub or Google', async () => {
      world.seedMethod({
        provider: UserAuthenticationMethodProvider.Github,
        providerId: '4242',
        providerData: { email: EMAIL, emailVerified: true },
        isVerified: true,
      });

      const result = await world.runImport([userWithPassword(GO_HASH)]);

      expect(counters(result)).toEqual({ imported: 0, updated: 0, unchanged: 0, skipped: 1 });
      const created = world.methods.find(
        (m) => m.provider === UserAuthenticationMethodProvider.Email
      );
      expect(created?.providerData).toEqual({});
    });
  });
});
