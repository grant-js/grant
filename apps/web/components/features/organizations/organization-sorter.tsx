import { OrganizationSortableField, OrganizationSortInput, SortOrder } from '@grantjs/schema';
import { useTranslations } from 'next-intl';

import { Sorter, type SortInput } from '@/components/common';
import { useOrganizationsStore } from '@/stores/organizations.store';

export function OrganizationSorter() {
  const t = useTranslations('organizations');

  const sort = useOrganizationsStore((state) => state.sort);
  const setSort = useOrganizationsStore((state) => state.setSort);

  const convertSort = (
    gqlSort?: OrganizationSortInput
  ): SortInput<OrganizationSortableField> | undefined => {
    if (!gqlSort) return undefined;
    return {
      field: gqlSort.field,
      order: gqlSort.order,
    };
  };

  const handleSortChange = (field: OrganizationSortableField, order: SortOrder) => {
    setSort(field, order);
  };

  const fields = Object.values(OrganizationSortableField).map(
    (value: OrganizationSortableField) => ({
      value,
      label: t(`sort.${value}`),
    })
  );

  return (
    <Sorter
      sort={convertSort(sort)}
      onSortChange={handleSortChange}
      fields={fields}
      defaultField={OrganizationSortableField.Name}
      translationNamespace="organizations"
    />
  );
}
