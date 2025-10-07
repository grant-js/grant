'use client';

import { Project, Tag } from '@logusgraphics/grant-schema';

import {
  EditDialog,
  EditDialogField,
  EditDialogRelationship,
} from '@/components/common/EditDialog';
import { PrimaryTagSelector } from '@/components/ui/primary-tag-selector';
import { TagCheckboxList } from '@/components/ui/tag-checkbox-list';
import { useProjectScope } from '@/hooks/common/useProjectScope';
import { useProjectMutations } from '@/hooks/projects';
import { useTags } from '@/hooks/tags';
import { useProjectsStore } from '@/stores/projects.store';

import { editProjectSchema, type EditProjectFormValues } from './types';

export function EditProjectDialog() {
  const scope = useProjectScope();
  const { tags, loading: tagsLoading } = useTags({ scope: scope! });
  const projectToEdit = useProjectsStore((state) => state.projectToEdit);
  const setProjectToEdit = useProjectsStore((state) => state.setProjectToEdit);
  const { updateProject } = useProjectMutations();

  const fields: EditDialogField[] = [
    {
      name: 'name',
      label: 'form.name',
      placeholder: 'form.namePlaceholder',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      label: 'form.description',
      placeholder: 'form.descriptionPlaceholder',
      type: 'textarea',
    },
  ];

  const relationships: EditDialogRelationship[] = [
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

  const mapProjectToFormValues = (project: Project): EditProjectFormValues => ({
    name: project.name,
    description: project.description || '',
    tagIds: project.tags?.map((tag: Tag) => tag.id),
    primaryTagId: project.tags?.find((tag: Tag) => tag.isPrimary)?.id || '',
  });

  const handleUpdate = async (projectId: string, values: EditProjectFormValues) => {
    await updateProject(projectId, {
      name: values.name,
      description: values.description,
      tagIds: values.tagIds,
      primaryTagId: values.primaryTagId,
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setProjectToEdit(null);
    }
  };

  return (
    <EditDialog
      open={!!projectToEdit}
      onOpenChange={handleOpenChange}
      entity={projectToEdit}
      title="editDialog.title"
      description="editDialog.description"
      confirmText="editDialog.confirm"
      cancelText="editDialog.cancel"
      updatingText="editDialog.updating"
      schema={editProjectSchema}
      defaultValues={
        projectToEdit
          ? {
              name: projectToEdit.name,
              description: projectToEdit.description || '',
              tagIds: [],
            }
          : {
              name: '',
              description: '',
              tagIds: [],
            }
      }
      fields={fields}
      relationships={relationships}
      mapEntityToFormValues={mapProjectToFormValues}
      onUpdate={handleUpdate}
      translationNamespace="projects"
    />
  );
}
