'use client';

import {
  SettingImageUploadDialog,
  type SettingImageUploadDialogProps,
} from '@/components/features/settings';
import { toProjectScope, useProjectScope } from '@/hooks/common';
import { useProjectMutations } from '@/hooks/projects';
import { useProjectsStore } from '@/stores/projects.store';

export function ProjectPictureUploadDialog() {
  const project = useProjectsStore((state) => state.projectForPictureUpload);
  const setProjectForPictureUpload = useProjectsStore((state) => state.setProjectForPictureUpload);
  const setProjectToEdit = useProjectsStore((state) => state.setProjectToEdit);
  const setProjects = useProjectsStore((state) => state.setProjects);
  const setCurrentProject = useProjectsStore((state) => state.setCurrentProject);
  const parentScope = useProjectScope();
  const { uploadProjectPictureDirect } = useProjectMutations();

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setProjectForPictureUpload(null);
    }
  };

  const handleUpload: SettingImageUploadDialogProps['onUpload'] = async (file) => {
    if (!project || !parentScope) return;
    const result = await uploadProjectPictureDirect(
      {
        projectId: project.id,
        scope: toProjectScope(parentScope, project.id),
      },
      file
    );

    if (!result?.url) return;

    const patch = { pictureUrl: result.url, updatedAt: new Date() };
    const state = useProjectsStore.getState();
    setProjects(
      state.projects.map((item) => (item.id === project.id ? { ...item, ...patch } : item))
    );
    if (state.projectToEdit?.id === project.id) {
      setProjectToEdit({ ...state.projectToEdit, ...patch });
    }
    if (state.currentProject?.id === project.id) {
      setCurrentProject({ ...state.currentProject, ...patch });
    }
  };

  return (
    <SettingImageUploadDialog
      open={!!project}
      onOpenChange={handleOpenChange}
      onUpload={handleUpload}
      currentImageUrl={project?.pictureUrl || undefined}
      translationNamespace="projects.branding.upload"
    />
  );
}
