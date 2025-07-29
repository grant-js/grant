import { useTranslations } from 'next-intl';

import { Sorter, type SortInput, type SortOrder } from '@/components/common';
import { UserSortOrder, UserSortableField, UserSortInput } from '@/graphql/generated/types';

interface UserSorterProps {
  sort?: UserSortInput;
  onSortChange: (field: UserSortableField, order: UserSortOrder) => void;
}

export function UserSorter({ sort, onSortChange }: UserSorterProps) {
  const t = useTranslations('users');

  // Convert GraphQL types to generic Sorter types
  const convertSort = (gqlSort?: UserSortInput): SortInput<UserSortableField> | undefined => {
    if (!gqlSort) return undefined;
    return {
      field: gqlSort.field,
      order: gqlSort.order === UserSortOrder.Asc ? 'ASC' : 'DESC',
    };
  };

  const handleSortChange = (field: UserSortableField, order: SortOrder) => {
    const gqlOrder = order === 'ASC' ? UserSortOrder.Asc : UserSortOrder.Desc;
    onSortChange(field, gqlOrder);
  };

  const fields = [
    {
      value: UserSortableField.Name,
      label: t('sort.name'),
    },
    {
      value: UserSortableField.Email,
      label: t('sort.email'),
    },
  ];

  return (
    <Sorter
      sort={convertSort(sort)}
      onSortChange={handleSortChange}
      fields={fields}
      defaultField={UserSortableField.Name}
      translationNamespace="users"
    />
  );
}
