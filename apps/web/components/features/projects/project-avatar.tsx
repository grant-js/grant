'use client';

import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Project } from '@grantjs/schema';
import { Pencil } from 'lucide-react';

import { Avatar } from '@/components/common';
import type { AvatarProps } from '@/components/common/common-types';
import { Button } from '@/components/ui/button';
import { useEmailVerified } from '@/hooks/auth';
import { useProjectScope } from '@/hooks/common';
import { getInitials } from '@/lib/utils';
import { useProjectsStore } from '@/stores/projects.store';

interface ProjectAvatarProps {
  project: Pick<Project, 'id' | 'name' | 'pictureUrl' | 'updatedAt'>;
  size?: AvatarProps['size'];
  interactive?: boolean;
  className?: string;
}

export function ProjectAvatar({
  project,
  size = 'md',
  interactive = false,
  className,
}: ProjectAvatarProps) {
  const t = useTranslations('projects.avatar');
  const isEmailVerified = useEmailVerified();
  const parentScope = useProjectScope();
  const setProjectForPictureUpload = useProjectsStore((state) => state.setProjectForPictureUpload);

  const canUpload = useGrant(ResourceSlug.Project, ResourceAction.Update, {
    scope: parentScope!,
    context: project.id
      ? { resource: { id: project.id, scope: { projects: [project.id] } } }
      : undefined,
    enabled: interactive && !!parentScope && !!project.id,
  });

  const showUploadOverlay = interactive && canUpload && isEmailVerified;

  return (
    <div className="relative shrink-0 group/avatar">
      <Avatar
        initial={getInitials(project.name, 2, 'P')}
        imageUrl={project.pictureUrl || undefined}
        cacheBuster={project.updatedAt}
        size={size}
        className={className}
      />
      {showUploadOverlay ? (
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="absolute inset-0 h-full w-full rounded-full opacity-0 transition-opacity group-hover/avatar:opacity-100 bg-black/50 hover:bg-black/60"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setProjectForPictureUpload(project as Project);
          }}
          aria-label={project.pictureUrl ? t('changeButton') : t('uploadButton')}
        >
          <Pencil className={size === 'xl' ? 'h-5 w-5 text-white' : 'h-4 w-4 text-white'} />
        </Button>
      ) : null}
    </div>
  );
}
