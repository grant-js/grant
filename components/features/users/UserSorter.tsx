import { useTranslations } from 'next-intl';

import { Sorter, type SortInput } from '@/components/common';
import { SortOrder, UserSortableField, UserSortInput } from '@/graphql/generated/types';
import { useUsersStore } from '@/stores/users.store';

export function UserSorter() {
  const t = useTranslations('users');

  const sort = useUsersStore((state) => state.sort);
  const setSort = useUsersStore((state) => state.setSort);

  const convertSort = (gqlSort?: UserSortInput): SortInput<UserSortableField> | undefined => {
    if (!gqlSort) return undefined;
    return {
      field: gqlSort.field,
      order: gqlSort.order,
    };
  };

  const handleSortChange = (field: UserSortableField, order: SortOrder) => {
    setSort(field, order);
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
