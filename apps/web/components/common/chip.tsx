import * as React from 'react';

import { VariantProps, cva } from 'class-variance-authority';
import { X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface ChipProps
  extends Omit<React.ComponentProps<'div'>, 'onClick'>, VariantProps<typeof chipVariants> {
  label: string;
  onDelete?: () => void;
  deletable?: boolean;
  disabled?: boolean;
}

const chipVariants = cva('inline-flex items-center gap-1.5 px-2 py-1', {
  variants: {
    variant: {
      default: '',
      secondary: '',
      destructive: '',
      outline: '',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

function Chip({
  label,
  onDelete,
  deletable = false,
  disabled = false,
  variant = 'secondary',
  className,
  ...props
}: ChipProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled && onDelete) {
      onDelete();
    }
  };

  return (
    <Badge variant={variant} className={cn(chipVariants({ variant }), className)} {...props}>
      <span className="text-sm">{label}</span>
      {deletable && !disabled && (
        <button
          type="button"
          onClick={handleDelete}
          className="ml-0.5 rounded-full hover:bg-secondary-foreground/20 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 p-0.5 transition-colors"
          aria-label={`Delete ${label}`}
          tabIndex={0}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </Badge>
  );
}

export { Chip, chipVariants };
