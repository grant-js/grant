import { RoleSortableField, RoleSortInput, SortOrder } from '@logusgraphics/grant-schema';
import { useTranslations } from 'next-intl';

import { Sorter, type SortInput } from '@/components/common';

interface UserRoleSorterProps {
  sort?: RoleSortInput;
  onSortChange: (field: RoleSortableField, order: SortOrder) => void;
}

export function UserRoleSorter({ sort, onSortChange }: UserRoleSorterProps) {
  const t = useTranslations('user.roles');

  const convertSort = (gqlSort?: RoleSortInput): SortInput<RoleSortableField> | undefined => {
    if (!gqlSort) return undefined;
    return {
      field: gqlSort.field,
      order: gqlSort.order,
    };
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
      onSortChange={onSortChange}
      fields={fields}
      defaultField={RoleSortableField.Name}
      translationNamespace="user.roles"
    />
  );
}
