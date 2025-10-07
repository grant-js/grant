'use client';

import {
  SortOrder,
  PermissionSortableField,
  PermissionSortInput,
} from '@logusgraphics/grant-schema';
import { useTranslations } from 'next-intl';

import { Sorter, type SortInput } from '@/components/common';
import { usePermissionsStore } from '@/stores/permissions.store';

export function PermissionSorter() {
  const t = useTranslations('permissions');

  const sort = usePermissionsStore((state) => state.sort);
  const setSort = usePermissionsStore((state) => state.setSort);

  const convertSort = (
    gqlSort?: PermissionSortInput
  ): SortInput<PermissionSortableField> | undefined => {
    if (!gqlSort) return undefined;
    return {
      field: gqlSort.field,
      order: gqlSort.order,
    };
  };

  const handleSortChange = (field: PermissionSortableField, order: SortOrder) => {
    setSort(field, order);
  };

  const fields = [
    {
      value: PermissionSortableField.Name,
      label: t('sort.name'),
    },
    {
      value: PermissionSortableField.Action,
      label: t('sort.action'),
    },
  ];

  return (
    <Sorter
      sort={convertSort(sort)}
      onSortChange={handleSortChange}
      fields={fields}
      defaultField={PermissionSortableField.Name}
      translationNamespace="permissions"
    />
  );
}
