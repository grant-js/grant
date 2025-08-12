'use client';

import { Plus } from 'lucide-react';

import { CreateDialog, CreateDialogRelationship } from '@/components/common';
import { TagCheckboxList } from '@/components/ui/tag-checkbox-list';
import { useProjectMutations, useOrganizationProjectMutations } from '@/hooks';
import { useScopeFromParams } from '@/hooks/common/useScopeFromParams';
import { useProjectTagMutations } from '@/hooks/project-tags';
import { useTags } from '@/hooks/tags';
import { useOrganizationsStore } from '@/stores/organizations.store';
import { useProjectsStore } from '@/stores/projects.store';

import { createProjectSchema, type CreateProjectFormValues } from './types';

export function CreateProjectDialog() {
  const scope = useScopeFromParams();
  const { tags, loading: tagsLoading } = useTags({ scope });
  const selectedOrganizationId = useOrganizationsStore((state) => state.selectedOrganizationId);
  const isCreateDialogOpen = useProjectsStore((state) => state.isCreateDialogOpen);
  const setCreateDialogOpen = useProjectsStore((state) => state.setCreateDialogOpen);

  const { createProject } = useProjectMutations();
  const { addOrganizationProject } = useOrganizationProjectMutations();
  const { addProjectTag } = useProjectTagMutations();

  const handleSubmit = async (values: CreateProjectFormValues) => {
    return createProject(values);
  };

  const handleAddRelationships = async (projectId: string, values: CreateProjectFormValues) => {
    const promises: Promise<any>[] = [];

    if (!selectedOrganizationId) {
      throw new Error('No organization selected');
    }

    // Add organization-project relationship
    promises.push(
      addOrganizationProject({
        organizationId: selectedOrganizationId,
        projectId,
      })
    );

    // Add project-tag relationships
    if (values.tagIds && values.tagIds.length > 0) {
      const addTagPromises = values.tagIds.map((tagId) =>
        addProjectTag({
          projectId,
          tagId,
        })
      );
      promises.push(...addTagPromises);
    }

    await Promise.all(promises);
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
      onAddRelationships={handleAddRelationships}
      translationNamespace="projects"
      submittingText="createDialog.submitting"
    />
  );
}
