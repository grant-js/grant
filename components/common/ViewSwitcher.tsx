'use client';

import { LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

export function ViewSwitcher({ currentView, onViewChange, options }: ViewSwitcherProps) {
  const currentOption = options.find((option) => option.value === currentView) || options[0];
  const CurrentIcon = currentOption.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="default" className="w-full sm:w-auto">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <CurrentIcon className="size-4" />
              {currentOption.label}
            </div>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
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
  );
}
