'use client';

import { Plus } from 'lucide-react';

import { CreateDialog, CreateDialogRelationship } from '@/components/common';
import { PrimaryTagSelector } from '@/components/ui/primary-tag-selector';
import { TagCheckboxList } from '@/components/ui/tag-checkbox-list';
import { useProjectMutations } from '@/hooks';
import { useProjectScope } from '@/hooks/common/useProjectScope';
import { useTags } from '@/hooks/tags';
import { useProjectsStore } from '@/stores/projects.store';

import { createProjectSchema, type CreateProjectFormValues } from './types';

export function CreateProjectDialog() {
  const scope = useProjectScope();
  const { tags, loading: tagsLoading } = useTags({ scope: scope! });
  const isCreateDialogOpen = useProjectsStore((state) => state.isCreateDialogOpen);
  const setCreateDialogOpen = useProjectsStore((state) => state.setCreateDialogOpen);

  const { createProject } = useProjectMutations();

  const handleSubmit = async (values: CreateProjectFormValues) => {
    return createProject({
      name: values.name,
      description: values.description,
      scope: scope!,
      tagIds: values.tagIds,
      primaryTagId: values.primaryTagId,
    });
  };

  const handleOpenChange = (open: boolean) => {
    setCreateDialogOpen(open);
  };

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
    {
      name: 'primaryTagId',
      label: 'form.primaryTag',
      renderComponent: (props: any) => <PrimaryTagSelector {...props} />,
      items: tags,
      loading: tagsLoading,
      loadingText: 'form.tagsLoading',
      emptyText: 'form.noTagsAvailable',
    },
  ];

  return (
    <CreateDialog
      open={isCreateDialogOpen}
      onOpenChange={handleOpenChange}
      title="createDialog.title"
      description="createDialog.description"
      triggerText="createDialog.trigger"
      confirmText="createDialog.confirm"
      cancelText="createDialog.cancel"
      icon={Plus}
      schema={createProjectSchema}
      defaultValues={{
        name: '',
        description: '',
        tagIds: [],
        primaryTagId: '',
      }}
      fields={[
        {
          name: 'name',
          label: 'form.name',
          placeholder: 'form.namePlaceholder',
          type: 'text',
        },
        {
          name: 'description',
          label: 'form.description',
          placeholder: 'form.descriptionPlaceholder',
          type: 'textarea',
        },
      ]}
      relationships={relationships}
      onCreate={handleSubmit}
      translationNamespace="projects"
      submittingText="createDialog.submitting"
    />
  );
}
