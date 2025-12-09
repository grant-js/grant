'use client';

import { ReactNode } from 'react';

import { getTagBorderClasses, TagColor } from '@logusgraphics/grant-constants';

import { CardDescription, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { Avatar, type AvatarProps } from './Avatar';

export interface CardHeaderProps {
  avatar: {
    initial: string;
    imageUrl?: string;
    cacheBuster?: string | Date | null;
    size?: AvatarProps['size'];
  };
  title: string;
  description?: string;
  actions?: ReactNode;
  color?: TagColor;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
}

export function CardHeader({
  avatar,
  title,
  description,
  actions,
  color,
  className,
  titleClassName,
  descriptionClassName,
}: CardHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between space-y-0 pb-1 w-full', className)}>
      <div className="flex items-center gap-4 min-w-0">
        <Avatar
          initial={avatar.initial}
          imageUrl={avatar.imageUrl}
          cacheBuster={avatar.cacheBuster}
          size={avatar.size || 'lg'}
          className={color ? cn('border-2', getTagBorderClasses(color)) : undefined}
        />
        <div className="min-w-0 flex-1">
          <CardTitle className={cn('text-base font-semibold truncate', titleClassName)}>
            {title}
          </CardTitle>
          {description && (
            <CardDescription
              className={cn('text-sm text-muted-foreground truncate', descriptionClassName)}
            >
              {description}
            </CardDescription>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
