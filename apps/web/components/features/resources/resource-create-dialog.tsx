'use client';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { DEFAULT_RESOURCE_ACTIONS } from '@grantjs/constants';
import { CreateResourceInput } from '@grantjs/schema';
import { PackagePlus } from 'lucide-react';
import { DefaultValues } from 'react-hook-form';

import {
  CreateDialog,
  DialogField,
  DialogRelationship,
  PrimaryTagSelector,
  PrimaryTagSelectorProps,
  TagCheckboxList,
  TagCheckboxListProps,
} from '@/components/common';
import { useScopeFromParams } from '@/hooks/common';
import { useResourceMutations } from '@/hooks/resources';
import { useTags } from '@/hooks/tags';
import { useResourcesStore } from '@/stores/resources.store';

import { ResourceCreateFormValues, createResourceSchema } from './resource-types';

export function ResourceCreateDialog() {
  const scope = useScopeFromParams();
  const { tags, loading: tagsLoading } = useTags({ scope: scope!, limit: -1 });
  const { createResource } = useResourceMutations();
  const isCreateDialogOpen = useResourcesStore((state) => state.isCreateDialogOpen);
  const setCreateDialogOpen = useResourcesStore((state) => state.setCreateDialogOpen);

  const canCreate = useGrant(ResourceSlug.Resource, ResourceAction.Create, {
    scope: scope!,
  });

  if (!scope || !canCreate) {
    return null;
  }

  const fields: DialogField[] = [
    {
      name: 'name',
      label: 'form.name',
      placeholder: 'form.name',
      type: 'text',
    },
    {
      name: 'slug',
      label: 'form.slug',
      placeholder: 'form.slugPlaceholder',
      type: 'slug',
      autoSlugifyFrom: 'name',
    },
    {
      name: 'description',
      label: 'form.description',
      placeholder: 'form.descriptionPlaceholder',
      type: 'textarea',
    },
    {
      name: 'actions',
      label: 'form.actions',
      placeholder: 'form.actionsPlaceholder',
      type: 'actions',
      info: 'form.actionsInfo',
    },
    {
      name: 'isActive',
      label: 'form.isActive',
      type: 'switch',
      info: 'form.isActiveInfo',
    },
  ];

  const defaultValues: DefaultValues<ResourceCreateFormValues> = {
    name: '',
    slug: '',
    description: '',
    actions: [...DEFAULT_RESOURCE_ACTIONS],
    isActive: true,
    tagIds: [],
    primaryTagId: '',
  };

  const relationships: DialogRelationship[] = [
    {
      name: 'tagIds',
      label: 'form.tags',
      renderComponent: (props: TagCheckboxListProps) => <TagCheckboxList {...props} />,
      items: tags,
      loading: tagsLoading,
      loadingText: 'form.tagsLoading',
      emptyText: 'form.noTagsAvailable',
    },
    {
      name: 'primaryTagId',
      label: 'form.primaryTag',
      renderComponent: (props: PrimaryTagSelectorProps) => <PrimaryTagSelector {...props} />,
      items: tags,
      loading: tagsLoading,
      loadingText: 'form.tagsLoading',
      emptyText: 'form.noTagsAvailable',
    },
  ];

  const handleCreate = async (values: ResourceCreateFormValues) => {
    await createResource({
      scope: scope!,
      name: values.name,
      slug: values.slug || undefined,
      description: values.description,
      actions: values.actions,
      isActive: values.isActive,
      tagIds: values.tagIds,
      primaryTagId: values.primaryTagId,
    } as CreateResourceInput);
  };

  const handleOpenChange = (open: boolean) => {
    setCreateDialogOpen(open);
  };

  return (
    <CreateDialog
      open={isCreateDialogOpen}
      icon={PackagePlus}
      schema={createResourceSchema}
      defaultValues={defaultValues}
      fields={fields}
      relationships={relationships}
      title="createDialog.title"
      description="createDialog.description"
      triggerText="createDialog.trigger"
      confirmText="createDialog.confirm"
      cancelText="deleteDialog.cancel"
      translationNamespace="resources"
      submittingText="createDialog.submitting"
      onCreate={handleCreate}
      onOpenChange={handleOpenChange}
    />
  );
}
