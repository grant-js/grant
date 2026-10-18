import type { DomainEventInput, EventAggregateRef } from '@grantjs/schema';

import { isProjectLinkedKind } from '@/repositories/project-links.repository';

/**
 * For a pivot aggregate, the entities it joins and the `data` field that names each.
 * The pivot rows themselves carry no project (`role_groups`, `user_roles`, ...);
 * the project is reached through the role, group or permission they join.
 * `user` is deliberately absent from every row: a user is not project-linked
 * through a pivot, membership is `project_users` and travels in the request scope.
 */
const PIVOT_ENTITIES: Record<
  string,
  ReadonlyArray<{ kind: EventAggregateRef['kind']; field: string }>
> = {
  roleGroup: [
    { kind: 'role', field: 'roleId' },
    { kind: 'group', field: 'groupId' },
  ],
  rolePermission: [
    { kind: 'role', field: 'roleId' },
    { kind: 'permission', field: 'permissionId' },
  ],
  groupPermission: [
    { kind: 'group', field: 'groupId' },
    { kind: 'permission', field: 'permissionId' },
  ],
  userRole: [{ kind: 'role', field: 'roleId' }],
  userGroup: [{ kind: 'group', field: 'groupId' }],
  userPermission: [{ kind: 'permission', field: 'permissionId' }],
};

/**
 * The project-linkable entities an event is about, derived from its aggregate
 * (keyed by aggregate kind, not event type, so a new event type about the same
 * aggregate is covered without touching this table). Empty for events about
 * something that is not linked to a project through a pivot.
 */
export function linkedEntityRefsOf(event: DomainEventInput): EventAggregateRef[] {
  const aggregate = event.aggregate;
  if (!aggregate) return [];

  if (isProjectLinkedKind(aggregate.kind)) return [aggregate];

  const pivot = PIVOT_ENTITIES[aggregate.kind];
  if (!pivot) return [];

  const snapshot = event.data.after ?? event.data.before ?? {};
  const refs: EventAggregateRef[] = [];
  for (const { kind, field } of pivot) {
    const id = snapshot[field];
    if (typeof id === 'string' && id.length > 0) refs.push({ kind, id });
  }
  return refs;
}
