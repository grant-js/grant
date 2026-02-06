'use client';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';

import { DeleteDialog } from '@/components/common';
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';
import { useScopeFromParams } from '@/hooks/common';
import { useProjectMutations } from '@/hooks/projects';
import { useProjectsStore } from '@/stores/projects.store';

export function ProjectDeleteDialog() {
  const scope = useScopeFromParams();
  const projectToDelete = useProjectsStore((state) => state.projectToDelete);
  const setProjectToDelete = useProjectsStore((state) => state.setProjectToDelete);
  const { deleteProject } = useProjectMutations();

  const canDelete = useGrant(ResourceSlug.Project, ResourceAction.Delete, {
    scope: scope!,
    context: projectToDelete
      ? { resource: { id: projectToDelete.id, scope: { projects: [projectToDelete.id] } } }
      : undefined,
  });
  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope);

  if (!scope || !canDelete || requiresEmailVerification) {
    return null;
  }

  const handleDelete = async () => {
    if (!projectToDelete) return;
    await deleteProject(projectToDelete.id, scope);
    setProjectToDelete(null);
  };

  return (
    <DeleteDialog
      open={!!projectToDelete}
      onOpenChange={(open) => !open && setProjectToDelete(null)}
      entityToDelete={projectToDelete}
      title="deleteDialog.title"
      description="deleteDialog.description"
      cancelText="deleteDialog.cancel"
      confirmText="deleteDialog.confirm"
      deletingText="deleteDialog.deleting"
      onDelete={handleDelete}
      translationNamespace="projects"
    />
  );
}
