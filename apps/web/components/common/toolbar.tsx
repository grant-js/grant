import { isValidElement, ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type ToolbarItemConfig = {
  key?: string;
  grow?: boolean;
  content: ReactNode;
};

export type ToolbarItem = ReactNode | ToolbarItemConfig;

function isToolbarItemConfig(item: ToolbarItem): item is ToolbarItemConfig {
  return (
    item !== null &&
    item !== undefined &&
    typeof item === 'object' &&
    !isValidElement(item) &&
    'content' in item
  );
}

export function toolbarGrow(content: ReactNode, key?: string): ToolbarItemConfig {
  return { content, grow: true, key };
}

function getItemKey(item: ToolbarItem, index: number): string {
  if (isToolbarItemConfig(item)) {
    return item.key ?? `toolbar-grow-${index}`;
  }
  if (isValidElement(item) && item.key != null) {
    return String(item.key);
  }
  return `toolbar-${index}`;
}

export interface ToolbarProps {
  items: ToolbarItem[];
  /** When true, keep toolbar items in a single horizontal row at all breakpoints (no vertical stack on mobile). */
  alwaysRow?: boolean;
  /** When true, toolbar spans the full width of its container (search can grow via toolbarGrow). */
  fullWidth?: boolean;
}

export function Toolbar({ items, alwaysRow = false, fullWidth = false }: ToolbarProps) {
  const filteredItems = items.filter((item) => {
    if (item == null || item === false) {
      return false;
    }
    if (isToolbarItemConfig(item)) {
      return true;
    }
    return Boolean(item);
  });

  return (
    <div
      className={cn(
        alwaysRow
          ? 'flex flex-row items-center gap-2 flex-wrap'
          : 'flex flex-col sm:flex-row sm:items-center gap-2',
        fullWidth && 'w-full min-w-0'
      )}
    >
      {filteredItems.map((item, index) => {
        const node = isToolbarItemConfig(item) ? item.content : item;
        const grow = isToolbarItemConfig(item) && item.grow;

        return (
          <div
            key={getItemKey(item, index)}
            className={cn(
              'flex items-center min-w-0',
              grow ? 'flex-1 basis-0' : 'shrink-0',
              !alwaysRow &&
                !grow &&
                'flex min-h-10 items-center sm:min-h-0 w-full sm:w-auto shrink-0'
            )}
          >
            {node}
          </div>
        );
      })}
    </div>
  );
}
