'use client';

import { Building2 } from 'lucide-react';

import {
  CreateDialog,
  CreateDialogField,
  CreateDialogRelationship,
} from '@/components/common/CreateDialog';
import { TagCheckboxList } from '@/components/ui/tag-checkbox-list';
import { useScopeFromParams } from '@/hooks/common/useScopeFromParams';
import { useOrganizationTagMutations } from '@/hooks/organization-tags';
import { useOrganizationMutations } from '@/hooks/organizations';
import { useTags } from '@/hooks/tags';
import { useOrganizationsStore } from '@/stores/organizations.store';

import { createOrganizationSchema, CreateOrganizationFormValues } from './types';

export function CreateOrganizationDialog() {
  const scope = useScopeFromParams();
  const { tags, loading: tagsLoading } = useTags({ scope });
  const { createOrganization } = useOrganizationMutations();
  const { addOrganizationTag } = useOrganizationTagMutations();

  // Use selective subscriptions to prevent unnecessary re-renders
  const isCreateDialogOpen = useOrganizationsStore((state) => state.isCreateDialogOpen);
  const setCreateDialogOpen = useOrganizationsStore((state) => state.setCreateDialogOpen);

  const fields: CreateDialogField[] = [
    {
      name: 'name',
      label: 'form.name',
      placeholder: 'form.name',
      type: 'text',
    },
  ];

  const relationships: CreateDialogRelationship[] = [
    {
      name: 'tagIds',
      label: 'form.tags',
      renderComponent: (props: any) => <TagCheckboxList {...props} />,
      items: tags,
      loading: tagsLoading,
      loadingText: 'form.tagsLoading',
      emptyText: 'form.noTagsAvailable',
    },
  ];

  const handleCreate = async (values: CreateOrganizationFormValues) => {
    return await createOrganization({
      name: values.name,
    });
  };

  const handleAddRelationships = async (
    organizationId: string,
    values: CreateOrganizationFormValues
  ) => {
    if (values.tagIds && values.tagIds.length > 0) {
      const addTagPromises = values.tagIds.map((tagId) =>
        addOrganizationTag({
          organizationId,
          tagId,
        })
      );
      await Promise.all(addTagPromises);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setCreateDialogOpen(open);
  };

  return (
    <CreateDialog
      open={isCreateDialogOpen}
      onOpenChange={handleOpenChange}
      title="createDialog.title"
      description="createDialog.description"
      triggerText="createDialog.trigger"
      confirmText="createDialog.confirm"
      cancelText="deleteDialog.cancel"
      icon={Building2}
      schema={createOrganizationSchema}
      defaultValues={{
        name: '',
        tagIds: [],
      }}
      fields={fields}
      relationships={relationships}
      onCreate={handleCreate}
      onAddRelationships={handleAddRelationships}
      translationNamespace="organizations"
      submittingText="createDialog.submitting"
    />
  );
}
