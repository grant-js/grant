'use client';

import { ComponentProps, ReactNode, useState } from 'react';

import { ChevronsUpDown } from 'lucide-react';

import { Avatar } from '@/components/common';
import { AvatarProps } from '@/components/common/common-types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

interface SidebarPopoverProps {
  icon?: ReactNode;
  avatar?: AvatarProps;
  title?: string;
  label?: string;
  content: ReactNode;
  buttonProps?: ComponentProps<typeof SidebarMenuButton>;
  contentProps?: ComponentProps<typeof PopoverContent>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export function SidebarPopover({
  icon,
  avatar,
  title,
  label,
  content,
  buttonProps,
  contentProps,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  className,
}: SidebarPopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const onOpenChange = controlledOnOpenChange ?? setInternalOpen;

  const {
    size = 'default',
    variant = 'default',
    className: buttonClassName,
    disabled,
    ...restButtonProps
  } = buttonProps || {};

  const {
    align = 'start',
    sideOffset = 4,
    className: contentClassName,
    ...restContentProps
  } = contentProps || {};

  const triggerContent = (
    <>
      {(avatar || icon) && (
        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-accent overflow-hidden [&>svg]:size-4 [&>svg]:text-sidebar-foreground">
          {avatar ? (
            <Avatar
              initial={avatar.initial}
              imageUrl={avatar.imageUrl}
              cacheBuster={avatar.cacheBuster}
              size={avatar.size || 'sm'}
              shape="squircle"
              className={cn('size-8', avatar.className)}
              fallbackClassName={avatar.fallbackClassName}
              icon={avatar.icon}
            />
          ) : (
            icon
          )}
        </div>
      )}
      {(title || label) && (
        <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
          {title && <span className="truncate font-medium">{title}</span>}
          {label && <span className="truncate text-xs">{label}</span>}
        </div>
      )}
      <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50 group-data-[collapsible=icon]:hidden" />
    </>
  );

  return (
    <SidebarMenu className={className}>
      <SidebarMenuItem>
        <Popover open={open} onOpenChange={onOpenChange}>
          <PopoverTrigger asChild>
            <SidebarMenuButton
              size={size}
              variant={variant}
              aria-expanded={open}
              className={cn('w-full', buttonClassName)}
              disabled={disabled}
              {...restButtonProps}
            >
              {triggerContent}
            </SidebarMenuButton>
          </PopoverTrigger>
          <PopoverContent
            align={align}
            sideOffset={sideOffset}
            className={cn('w-[--radix-popover-trigger-width] min-w-56 p-0', contentClassName)}
            {...restContentProps}
          >
            {content}
          </PopoverContent>
        </Popover>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
