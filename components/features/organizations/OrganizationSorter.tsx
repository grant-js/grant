import { useTranslations } from 'next-intl';

import { Sorter, type SortInput } from '@/components/common';
import {
  OrganizationSortableField,
  OrganizationSortInput,
  SortOrder,
} from '@/graphql/generated/types';
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

  const fields = [
    {
      value: OrganizationSortableField.Name,
      label: t('sort.name'),
    },
    {
      value: OrganizationSortableField.CreatedAt,
      label: t('sort.createdAt'),
    },
    {
      value: OrganizationSortableField.UpdatedAt,
      label: t('sort.updatedAt'),
    },
  ];

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
