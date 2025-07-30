import { useTranslations } from 'next-intl';

import { Sorter, type SortInput, type SortOrder } from '@/components/common';
import { RoleSortOrder, RoleSortableField, RoleSortInput } from '@/graphql/generated/types';
import { useRolesStore } from '@/stores/roles.store';

export function RoleSorter() {
  const t = useTranslations('roles');

  // Use selective subscriptions to prevent unnecessary re-renders
  const sort = useRolesStore((state) => state.sort);
  const setSort = useRolesStore((state) => state.setSort);

  // Convert GraphQL types to generic Sorter types
  const convertSort = (gqlSort?: RoleSortInput): SortInput<RoleSortableField> | undefined => {
    if (!gqlSort) return undefined;
    return {
      field: gqlSort.field,
      order: gqlSort.order === RoleSortOrder.Asc ? 'ASC' : 'DESC',
    };
  };

  const handleSortChange = (field: RoleSortableField, order: SortOrder) => {
    const gqlOrder = order === 'ASC' ? RoleSortOrder.Asc : RoleSortOrder.Desc;
    setSort(field, gqlOrder);
  };

  const fields = [
    {
      value: RoleSortableField.Name,
      label: t('sort.name'),
    },
  ];

  return (
    <Sorter
      sort={convertSort(sort)}
      onSortChange={handleSortChange}
      fields={fields}
      defaultField={RoleSortableField.Name}
      translationNamespace="roles"
    />
  );
}
