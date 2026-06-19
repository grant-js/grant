import { SortOrder, Tenant } from '@grantjs/schema';

import { parseRelations } from '@/lib/field-selection.lib';

export interface SortInput<TSortableField extends string = string> {
  field: TSortableField;
  order: SortOrder;
}

export interface QueryListCommonsParams {
  fields?: string[] | string | null;
  relations?: string[] | string | null;
  sortField?: string;
  sortOrder?: SortOrder;
  scopeId?: string;
  tenant?: Tenant;
}

export interface QueryListCommonsResult<TEntity, TSortInput extends SortInput> {
  requestedFields?: Array<keyof TEntity>;
  sort?: TSortInput;
  scope?: { id: string; tenant: Tenant };
}

export function buildSortInput<TSortableField extends string>(
  sortField: TSortableField | undefined,
  sortOrder: SortOrder | undefined
): SortInput<TSortableField> | undefined {
  if (!sortField || !sortOrder) {
    return undefined;
  }

  return {
    field: sortField,
    order: sortOrder,
  };
}

export function buildScope(
  scopeId: string | undefined,
  tenant: Tenant | undefined
): { id: string; tenant: Tenant } | undefined {
  if (!scopeId || !tenant) {
    return undefined;
  }

  return {
    id: scopeId,
    tenant,
  };
}

export function parseRequestedFields<TEntity>(
  fields?: string[] | string | null,
  relations?: string[] | string | null
): Array<keyof TEntity> | undefined {
  const requestedFields = [
    ...(parseRelations<TEntity>(relations) ?? []),
    ...(parseRelations<TEntity>(fields) ?? []),
  ];

  return requestedFields.length > 0 ? [...new Set(requestedFields)] : undefined;
}

export function queryListCommons<TEntity, TSortInput extends SortInput>(
  params: QueryListCommonsParams
): QueryListCommonsResult<TEntity, TSortInput> {
  const { fields, relations, sortField, sortOrder, scopeId, tenant } = params;

  return {
    requestedFields: parseRequestedFields<TEntity>(fields, relations),
    sort: buildSortInput<TSortInput['field']>(
      sortField as TSortInput['field'] | undefined,
      sortOrder
    ) as TSortInput | undefined,
    scope: buildScope(scopeId, tenant),
  };
}
