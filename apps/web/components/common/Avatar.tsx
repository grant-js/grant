'use client';

import { AvatarFallback, AvatarImage, Avatar as UIAvatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { addImageCacheBuster } from '@/lib/utils/image-url';

export interface AvatarProps {
  initial: string;
  imageUrl?: string;
  cacheBuster?: string | Date | null;
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
  cacheBuster,
  size = 'md',
  className,
  fallbackClassName,
}: AvatarProps) {
  const cachedImageUrl = addImageCacheBuster(imageUrl, cacheBuster);

  return (
    <UIAvatar className={cn('bg-primary/10', sizeClasses[size], className)}>
      {cachedImageUrl && <AvatarImage src={cachedImageUrl} alt={initial} />}
      <AvatarFallback className={cn('font-medium', fallbackClassName)}>
        {initial.toUpperCase()}
      </AvatarFallback>
    </UIAvatar>
  );
}
