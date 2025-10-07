'use client';

import { Avatar as UIAvatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export interface AvatarProps {
  initial: string;
  imageUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  fallbackClassName?: string;
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
};

export function Avatar({
  initial,
  imageUrl,
  size = 'md',
  className,
  fallbackClassName,
}: AvatarProps) {
  return (
    <UIAvatar className={cn('bg-primary/10', sizeClasses[size], className)}>
      {imageUrl && <AvatarImage src={imageUrl} alt={initial} />}
      <AvatarFallback className={cn('text-primary font-medium', fallbackClassName)}>
        {initial.toUpperCase()}
      </AvatarFallback>
    </UIAvatar>
  );
}
