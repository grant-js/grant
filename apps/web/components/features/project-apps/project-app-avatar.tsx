'use client';

import type { ProjectApp } from '@grantjs/schema';
import { LayoutGrid } from 'lucide-react';

import { Avatar } from '@/components/common';
import type { AvatarProps } from '@/components/common/common-types';
import { getInitials } from '@/lib/utils';

interface ProjectAppAvatarProps {
  projectApp: Pick<ProjectApp, 'name' | 'clientId' | 'pictureUrl' | 'updatedAt'>;
  size?: AvatarProps['size'];
  className?: string;
}

export function ProjectAppAvatar({ projectApp, size = 'md', className }: ProjectAppAvatarProps) {
  return (
    <Avatar
      initial={getInitials(projectApp.name || projectApp.clientId, 2, 'A')}
      imageUrl={projectApp.pictureUrl || undefined}
      cacheBuster={projectApp.updatedAt}
      icon={<LayoutGrid className="h-5 w-5 text-muted-foreground" />}
      size={size}
      className={className}
    />
  );
}
