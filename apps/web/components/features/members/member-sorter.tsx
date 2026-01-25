import { OrganizationMemberSortableField, SortOrder } from '@grantjs/schema';
import { useTranslations } from 'next-intl';

import { Sorter, type SortInput } from '@/components/common';
import { useMembersStore } from '@/stores/members.store';

export function MemberSorter() {
  const t = useTranslations('members');

  const sort = useMembersStore((state) => state.sort);
  const setSort = useMembersStore((state) => state.setSort);

  const convertSort = (): SortInput<OrganizationMemberSortableField> | undefined => {
    if (!sort) return undefined;
    return {
      field: sort.field,
      order: sort.order,
    };
  };

  const handleSortChange = (field: OrganizationMemberSortableField, order: SortOrder) => {
    setSort(field, order);
  };

  const fields = Object.values(OrganizationMemberSortableField).map((field) => ({
    value: field,
    label: t(`sort.${field}`),
  }));

  return (
    <Sorter
      sort={convertSort()}
      onSortChange={handleSortChange}
      fields={fields}
      defaultField={OrganizationMemberSortableField.Name}
      translationNamespace="members"
    />
  );
}
