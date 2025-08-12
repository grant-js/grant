'use client';

import {
  EditDialog,
  EditDialogField,
  EditDialogRelationship,
} from '@/components/common/EditDialog';
import { TagCheckboxList } from '@/components/ui/tag-checkbox-list';
import { Project, Tag } from '@/graphql/generated/types';
import { useScopeFromParams } from '@/hooks/common/useScopeFromParams';
import { useProjectTagMutations } from '@/hooks/project-tags';
import { useProjectMutations } from '@/hooks/projects';
import { useTags } from '@/hooks/tags';
import { useProjectsStore } from '@/stores/projects.store';

import { editProjectSchema, type EditProjectFormValues } from './types';

export function EditProjectDialog() {
  const scope = useScopeFromParams();
  const { tags, loading: tagsLoading } = useTags({ scope });
  const projectToEdit = useProjectsStore((state) => state.projectToEdit);
  const setProjectToEdit = useProjectsStore((state) => state.setProjectToEdit);
  const { updateProject } = useProjectMutations();
  const { addProjectTag, removeProjectTag } = useProjectTagMutations();

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
  ];

  const mapProjectToFormValues = (project: Project): EditProjectFormValues => ({
    name: project.name,
    description: project.description || '',
    tagIds: project.tags?.map((tag: Tag) => tag.id),
  });

  const handleUpdate = async (projectId: string, values: EditProjectFormValues) => {
    await updateProject(projectId, {
      name: values.name,
      description: values.description,
    });
  };

  const handleAddRelationships = async (
    projectId: string,
    relationshipName: string,
    itemIds: string[]
  ) => {
    if (relationshipName === 'tagIds') {
      const addPromises = itemIds.map((tagId) =>
        addProjectTag({
          projectId,
          tagId,
        }).catch((error: any) => {
          console.error('Error adding project tag:', error);
          throw error;
        })
      );
      await Promise.all(addPromises);
    }
  };

  const handleRemoveRelationships = async (
    projectId: string,
    relationshipName: string,
    itemIds: string[]
  ) => {
    if (relationshipName === 'tagIds') {
      const removePromises = itemIds.map((tagId) =>
        removeProjectTag({
          projectId,
          tagId,
        }).catch((error: any) => {
          console.error('Error removing project tag:', error);
          throw error;
        })
      );
      await Promise.all(removePromises);
    }
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
      onAddRelationships={handleAddRelationships}
      onRemoveRelationships={handleRemoveRelationships}
      translationNamespace="projects"
    />
  );
}
