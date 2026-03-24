'use client';

import { LayoutTemplate, LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface ViewOption {
  value: string;
  icon: LucideIcon;
  label: string;
}

interface ViewSwitcherProps {
  currentView: string;
  onViewChange: (view: string) => void;
  options: ViewOption[];
}

/** Icon shown on the trigger button. LayoutTemplate = "switch view/layout" to avoid duplicating section icons (e.g. LayoutGrid for project-apps). */
const TRIGGER_ICON = LayoutTemplate;

export function ViewSwitcher({ currentView, onViewChange, options }: ViewSwitcherProps) {
  const currentOption = options.find((option) => option.value === currentView) || options[0];

  const tooltipText = currentOption.label;

  const buttonContent = (
    <Button
      variant="outline"
      size="default"
      className="w-full sm:w-auto sm:max-[1599px]:aspect-square sm:max-[1599px]:p-2 min-[1600px]:px-4 min-[1600px]:py-2"
    >
      <div className="flex w-full items-center justify-center min-[1600px]:justify-start gap-2">
        <TRIGGER_ICON className="size-4 shrink-0" />
        <span className="hidden max-sm:inline min-[1600px]:inline min-w-0 max-[1599px]:truncate min-[1600px]:overflow-visible">
          {currentOption.label}
        </span>
      </div>
    </Button>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <DropdownMenu>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>{buttonContent}</DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">{tooltipText}</TooltipContent>
          <DropdownMenuContent align="end" fullWidthOnMobile>
            {options.map((option) => {
              const Icon = option.icon;
              return (
                <DropdownMenuItem key={option.value} onClick={() => onViewChange(option.value)}>
                  <Icon className="mr-2 size-4" />
                  {option.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </Tooltip>
    </TooltipProvider>
  );
}
