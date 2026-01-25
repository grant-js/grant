'use client';

import { AvatarFallback, AvatarImage, Avatar as UIAvatar } from '@/components/ui/avatar';
import { addImageCacheBuster, cn } from '@/lib/utils';

import { AvatarProps } from './common-types';

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
};

export function Avatar({
  initial,
  imageUrl,
  cacheBuster,
  size = 'md',
  shape = 'circle',
  className,
  fallbackClassName,
  icon,
}: AvatarProps) {
  const cachedImageUrl = addImageCacheBuster(imageUrl, cacheBuster);
  const shapeClass = shape === 'squircle' ? 'rounded-md' : 'rounded-full';

  return (
    <UIAvatar className={cn('bg-primary/10', sizeClasses[size], shapeClass, className)}>
      {cachedImageUrl && <AvatarImage src={cachedImageUrl} alt={initial} />}
      <AvatarFallback className={cn('font-medium', shapeClass, fallbackClassName)}>
        {icon || initial.toUpperCase()}
      </AvatarFallback>
    </UIAvatar>
  );
}
