import { SortOrder, RoleSortableField, RoleSortInput } from '@logusgraphics/grant-schema';
import { useTranslations } from 'next-intl';

import { Sorter, type SortInput } from '@/components/common';
import { useRolesStore } from '@/stores/roles.store';

export function RoleSorter() {
  const t = useTranslations('roles');

  const sort = useRolesStore((state) => state.sort);
  const setSort = useRolesStore((state) => state.setSort);

  const convertSort = (gqlSort?: RoleSortInput): SortInput<RoleSortableField> | undefined => {
    if (!gqlSort) return undefined;
    return {
      field: gqlSort.field,
      order: gqlSort.order,
    };
  };

  const handleSortChange = (field: RoleSortableField, order: SortOrder) => {
    setSort(field, order);
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
