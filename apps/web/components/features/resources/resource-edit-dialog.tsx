'use client';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Resource, Tag } from '@grantjs/schema';
import { DefaultValues } from 'react-hook-form';

import {
  DialogField,
  DialogRelationship,
  EditDialog,
  PrimaryTagSelector,
  PrimaryTagSelectorProps,
  TagCheckboxList,
  TagCheckboxListProps,
} from '@/components/common';
import { useScopeFromParams } from '@/hooks/common';
import { useResourceMutations } from '@/hooks/resources';
import { useTags } from '@/hooks/tags';
import { useResourcesStore } from '@/stores/resources.store';

import { ResourceEditFormValues, editResourceSchema } from './resource-types';

export function ResourceEditDialog() {
  const scope = useScopeFromParams();
  const { tags, loading: tagsLoading } = useTags({ scope: scope!, limit: -1 });
  const { updateResource } = useResourceMutations();
  const resourceToEdit = useResourcesStore((state) => state.resourceToEdit);
  const setResourceToEdit = useResourcesStore((state) => state.setResourceToEdit);

  const canUpdate = useGrant(ResourceSlug.Resource, ResourceAction.Update, {
    scope: scope!,
  });

  if (!scope || !canUpdate) {
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

  const mapResourceToFormValues = (resource: Resource): ResourceEditFormValues => ({
    name: resource.name,
    slug: resource.slug,
    description: resource.description || '',
    actions: resource.actions || [],
    isActive: resource.isActive,
    tagIds: resource.tags?.map((tag: Tag) => tag.id),
    primaryTagId: resource.tags?.find((tag: Tag) => tag.isPrimary)?.id || '',
  });

  const handleUpdate = async (resourceId: string, values: ResourceEditFormValues) => {
    await updateResource({
      id: resourceId,
      input: {
        scope: scope!,
        name: values.name,
        slug: values.slug,
        description: values.description,
        actions: values.actions,
        isActive: values.isActive,
        tagIds: values.tagIds,
        primaryTagId: values.primaryTagId,
      },
    });
  };

  const defaultValues: DefaultValues<ResourceEditFormValues> = {
    name: resourceToEdit?.name || '',
    slug: resourceToEdit?.slug || '',
    description: resourceToEdit?.description || '',
    actions: resourceToEdit?.actions || [],
    isActive: resourceToEdit?.isActive || true,
    tagIds: resourceToEdit?.tags?.map((tag: Tag) => tag.id) || [],
    primaryTagId: resourceToEdit?.tags?.find((tag: Tag) => tag.isPrimary)?.id || '',
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setResourceToEdit(null);
    }
  };

  return (
    <EditDialog
      open={!!resourceToEdit}
      entity={resourceToEdit}
      schema={editResourceSchema}
      defaultValues={defaultValues}
      fields={fields}
      relationships={relationships}
      title="editDialog.title"
      description="editDialog.description"
      confirmText="editDialog.confirm"
      cancelText="editDialog.cancel"
      updatingText="editDialog.updating"
      translationNamespace="resources"
      mapEntityToFormValues={mapResourceToFormValues}
      onUpdate={handleUpdate}
      onOpenChange={handleOpenChange}
    />
  );
}
