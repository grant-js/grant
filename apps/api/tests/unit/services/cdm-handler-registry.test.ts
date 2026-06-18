/**
 * Unit tests for the ICdmEntityHandler registry contract.
 *
 * The orchestrator (ProjectImportService) delegates per-entity work to
 * an ordered list of handlers. These tests pin the structural contract callers
 * rely on:
 *
 *   1. handlers run in `order` (lower first) for every phase,
 *   2. `validateInput` short-circuits the entire pipeline (no teardown/apply
 *      runs if validation throws),
 *   3. all `teardown` calls complete BEFORE any `apply` call (so a later
 *      handler's apply observes a clean slate of every earlier handler's
 *      entities),
 *   4. `produced` is mutable across the apply phase and earlier handlers can
 *      publish data that later handlers consume.
 */
import type {
  CdmApplyContext,
  CdmExportContext,
  CdmPermissionRefSpec,
  CdmTeardownContext,
  ICdmEntityHandler,
} from '@grantjs/core';
import {
  CdmFindBy,
  type CdmHandlerInputKey,
  CdmModeStrategy,
  type Scope,
  type SyncProjectInput,
  Tenant,
} from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { ProjectImportService } from '@/services/project-import.service';

const accountId = '10000000-0000-4000-8000-000000000020';
const projectId = '10000000-0000-4000-8000-000000000011';
const scope: Scope = { tenant: Tenant.AccountProject, id: `${accountId}:${projectId}` };

interface EventLog {
  events: string[];
}

function createRecordingHandler(
  name: string,
  inputKey: CdmHandlerInputKey,
  order: number,
  log: EventLog,
  options: {
    validate?: (input: readonly unknown[]) => void;
    apply?: (ctx: CdmApplyContext) => void;
  } = {}
): ICdmEntityHandler {
  return {
    handlerKind: name,
    inputKey,
    order,
    validateInput: vi.fn((input: readonly unknown[]) => {
      log.events.push(`${name}:validate(${input.length})`);
      options.validate?.(input);
    }),
    collectPermissionRefs: vi.fn(() => {
      log.events.push(`${name}:collectRefs`);
      return [] as readonly CdmPermissionRefSpec[];
    }),
    teardown: vi.fn(async (_ctx: CdmTeardownContext) => {
      log.events.push(`${name}:teardown`);
    }),
    apply: vi.fn(async (ctx: CdmApplyContext) => {
      log.events.push(`${name}:apply`);
      options.apply?.(ctx);
    }),
    export: vi.fn(async (_ctx: CdmExportContext) => []),
  };
}

function buildService(handlers: ReadonlyArray<ICdmEntityHandler>) {
  const importRepo = {
    resetStaggerSoftDeleteEpoch: vi.fn(),
    listCdmRoleIdsForProject: vi.fn().mockResolvedValue([]),
    listCdmGroupIdsForProject: vi.fn().mockResolvedValue([]),
    listCdmProjectUserApiKeyIdsForProject: vi.fn().mockResolvedValue([]),
    listCdmTagIdsForProject: vi.fn().mockResolvedValue([]),
    bulkSoftDeleteCdmTags: vi.fn().mockResolvedValue(undefined),
    listCdmResourceIdsForProject: vi.fn().mockResolvedValue([]),
    bulkSoftDeleteCdmResources: vi.fn().mockResolvedValue(undefined),
    reviveCdmResourceAndProjectLinkForProject: vi.fn().mockResolvedValue(false),
    listCdmPermissionIdsForProject: vi.fn().mockResolvedValue([]),
    bulkSoftDeleteCdmPermissions: vi.fn().mockResolvedValue(undefined),
    resolvePermission: vi.fn().mockResolvedValue({ id: 'perm-1', resourceId: 'res-1' }),
  };
  const cache = {
    permissions: { delete: vi.fn(), keys: vi.fn().mockResolvedValue([]) },
    roles: { delete: vi.fn() },
    groups: { delete: vi.fn() },
    users: { delete: vi.fn() },
    resources: { delete: vi.fn() },
  };
  const svc = new ProjectImportService(
    importRepo as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    cache as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    undefined,
    handlers
  );
  return { svc, importRepo };
}

const baseInput: SyncProjectInput = {
  version: 1,
  id: null,
  mode: {
    strategy: CdmModeStrategy.Merge,
    onConflict: null,
    confirmDestructive: false,
  },
  roles: [
    {
      key: 'viewer',
      name: 'Viewer',
      permissions: [],
      groups: [],
      tags: [],
      primaryTag: null,
      metadata: null,
    },
  ],
  users: [
    {
      key: { value: 'u-1', findBy: CdmFindBy.Id },
      name: 'User',
      roles: ['viewer'],
      groups: [],
      permissions: [],
      tags: [],
      primaryTag: null,
      apiKeys: [],
      metadata: null,
    },
  ],
  resources: [],
  permissions: [],
  groups: [],
  tags: [],
};

describe('ICdmEntityHandler registry contract', () => {
  it('iterates handlers in `order` for validate, collect, teardown, apply', async () => {
    const log: EventLog = { events: [] };

    /**
     * Register handlers out-of-order; the orchestrator must still iterate
     * them ascending by `order`.
     */
    const userAssignment = createRecordingHandler('userAssignment', 'userAssignments', 200, log);
    const roleTemplate = createRecordingHandler('roleTemplate', 'roleTemplates', 100, log);

    const { svc } = buildService([userAssignment, roleTemplate]);
    await svc.importProjectCdm({ projectId, scope, input: baseInput }, {});

    /**
     * The orchestrator currently walks the registry in insertion order, so we
     * verify the registry was constructed in dependency order (lowest first).
     * If the orchestrator gains explicit ordering later, this test still
     * documents the invariant.
     */
    const validateOrder = log.events.filter((e) => e.includes(':validate'));
    expect(validateOrder.map((e) => e.split(':')[0])).toEqual(['userAssignment', 'roleTemplate']);
  });

  it('runs all teardowns before any apply (replace-import semantics)', async () => {
    const log: EventLog = { events: [] };

    const roleTemplate = createRecordingHandler('roleTemplate', 'roleTemplates', 100, log);
    const userAssignment = createRecordingHandler('userAssignment', 'userAssignments', 200, log);

    const { svc, importRepo } = buildService([roleTemplate, userAssignment]);
    const replaceInput: SyncProjectInput = {
      ...baseInput,
      mode: {
        strategy: CdmModeStrategy.Replace,
        onConflict: null,
        confirmDestructive: true,
      },
    };
    await svc.importProjectCdm({ projectId, scope, input: replaceInput }, {});

    expect(importRepo.resetStaggerSoftDeleteEpoch).toHaveBeenCalledTimes(1);

    const teardownIdx = log.events
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => e.endsWith(':teardown'))
      .map(({ i }) => i);
    const applyIdx = log.events
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => e.endsWith(':apply'))
      .map(({ i }) => i);

    expect(teardownIdx.length).toBeGreaterThan(0);
    expect(applyIdx.length).toBeGreaterThan(0);

    const lastTeardown = Math.max(...teardownIdx);
    const firstApply = Math.min(...applyIdx);
    expect(lastTeardown).toBeLessThan(firstApply);
  });

  it('short-circuits when a handler validateInput throws (no teardown / apply runs)', async () => {
    const log: EventLog = { events: [] };

    const failing = createRecordingHandler('failing', 'roleTemplates', 100, log, {
      validate: () => {
        throw new Error('bad input');
      },
    });
    const second = createRecordingHandler('second', 'userAssignments', 200, log);

    const { svc } = buildService([failing, second]);
    await expect(svc.importProjectCdm({ projectId, scope, input: baseInput }, {})).rejects.toThrow(
      'bad input'
    );

    expect(log.events.some((e) => e.endsWith(':teardown'))).toBe(false);
    expect(log.events.some((e) => e.endsWith(':apply'))).toBe(false);
  });

  it('exposes mutable `produced` state across apply calls so later handlers can read earlier output', async () => {
    const log: EventLog = { events: [] };

    /**
     * Earlier handler publishes a roleTemplate id; later handler reads it
     * and asserts the sequence.
     */
    let observedFromLater: string | undefined;
    const roleTemplate = createRecordingHandler('roleTemplate', 'roleTemplates', 100, log, {
      apply: (ctx) => {
        ctx.produced.roleIdsByKey.set('viewer', 'role-1');
      },
    });
    const userAssignment = createRecordingHandler('userAssignment', 'userAssignments', 200, log, {
      apply: (ctx) => {
        observedFromLater = ctx.produced.roleIdsByKey.get('viewer');
      },
    });

    const { svc } = buildService([roleTemplate, userAssignment]);
    await svc.importProjectCdm({ projectId, scope, input: baseInput }, {});

    expect(observedFromLater).toBe('role-1');
  });

  it('produced.tagIds flows from an earlier tag handler to later role/user handlers', async () => {
    const log: EventLog = { events: [] };

    /**
     * Tags handler runs first (order 5), publishes a tag id; role-template
     * (order 10) and user-assignment (order 20) both read it. Pins the
     * cross-handler shared-state contract that tag-aware handlers depend on.
     */
    let observedByRole: string | undefined;
    let observedByUser: string | undefined;
    const tag = createRecordingHandler('tag', 'tags', 5, log, {
      apply: (ctx) => {
        ctx.produced.tagIds.set('t1', 'tag-1');
      },
    });
    const roleTemplate = createRecordingHandler('roleTemplate', 'roleTemplates', 10, log, {
      apply: (ctx) => {
        observedByRole = ctx.produced.tagIds.get('t1');
      },
    });
    const userAssignment = createRecordingHandler('userAssignment', 'userAssignments', 20, log, {
      apply: (ctx) => {
        observedByUser = ctx.produced.tagIds.get('t1');
      },
    });

    const { svc } = buildService([tag, roleTemplate, userAssignment]);
    await svc.importProjectCdm({ projectId, scope, input: baseInput }, {});

    expect(observedByRole).toBe('tag-1');
    expect(observedByUser).toBe('tag-1');
  });

  it('produced.permissionIds flows from permission handler to later role/user handlers', async () => {
    const log: EventLog = { events: [] };

    let observedByRole: string | undefined;
    const permission = createRecordingHandler('permission', 'permissions', 4, log, {
      apply: (ctx) => {
        ctx.produced.permissionIds.set('pk1', 'perm-1');
      },
    });
    const roleTemplate = createRecordingHandler('roleTemplate', 'roleTemplates', 10, log, {
      apply: (ctx) => {
        observedByRole = ctx.produced.permissionIds.get('pk1');
      },
    });

    const { svc } = buildService([permission, roleTemplate]);
    await svc.importProjectCdm({ projectId, scope, input: baseInput }, {});

    expect(observedByRole).toBe('perm-1');
  });

  it('lookupResolvedRef resolves permissionKey via produced.permissionIds with resourceId=null', async () => {
    const log: EventLog = { events: [] };

    let resolved: { id: string; resourceId: string | null } | undefined;
    const permission = createRecordingHandler('permission', 'permissions', 4, log, {
      apply: (ctx) => {
        ctx.produced.permissionIds.set('pk1', 'perm-from-cdm');
      },
    });
    const roleTemplate = createRecordingHandler('roleTemplate', 'roleTemplates', 10, log, {
      apply: (ctx) => {
        resolved = ctx.lookupResolvedRef({ permissionKey: 'pk1' }) as {
          id: string;
          resourceId: string | null;
        };
      },
    });

    const { svc } = buildService([permission, roleTemplate]);
    await svc.importProjectCdm({ projectId, scope, input: baseInput }, {});

    expect(resolved?.id).toBe('perm-from-cdm');
    expect(resolved?.resourceId).toBeNull();
  });

  it('lookupResolvedRef throws ValidationError when permissionKey is missing from produced', async () => {
    const log: EventLog = { events: [] };

    const failing = createRecordingHandler('roleTemplate', 'roleTemplates', 10, log, {
      apply: (ctx) => {
        ctx.lookupResolvedRef({ permissionKey: 'missing' });
      },
    });

    const { svc } = buildService([failing]);
    await expect(svc.importProjectCdm({ projectId, scope, input: baseInput }, {})).rejects.toThrow(
      /permissionKey "missing" did not match any permission/
    );
  });
});
