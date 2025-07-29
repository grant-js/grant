'use client';

import { ReactNode } from 'react';

import { CardTitle, CardDescription } from '@/components/ui/card';
import { getTagBorderColorClasses } from '@/lib/tag-colors';
import { cn } from '@/lib/utils';

import { Avatar, type AvatarProps } from './Avatar';

export interface CardHeaderProps {
  /**
   * Avatar configuration
   */
  avatar: {
    initial: string;
    imageUrl?: string;
    size?: AvatarProps['size'];
  };
  /**
   * Title text to display
   */
  title: string;
  /**
   * Optional description text to display below the title
   */
  description?: string;
  /**
   * Actions to display on the right side of the header
   */
  actions?: ReactNode;
  /**
   * Tag color for avatar border styling
   */
  color?: string;
  /**
   * Additional CSS classes for the header container
   */
  className?: string;
  /**
   * Additional CSS classes for the title
   */
  titleClassName?: string;
  /**
   * Additional CSS classes for the description
   */
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
    <div className={cn('flex items-start justify-between space-y-0 pb-1 w-full', className)}>
      <div className="flex items-start gap-4 min-w-0">
        <Avatar
          initial={avatar.initial}
          imageUrl={avatar.imageUrl}
          size={avatar.size || 'lg'}
          className={color ? cn('border-2', getTagBorderColorClasses(color)) : undefined}
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
