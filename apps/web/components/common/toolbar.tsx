import { ReactNode } from 'react';

export interface ToolbarProps {
  items: ReactNode[];
}

export function Toolbar({ items }: ToolbarProps) {
  // Filter out falsy items (null, undefined, false) before rendering
  const filteredItems = items.filter(Boolean);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      {filteredItems.map((item, index) => (
        <div
          key={index}
          className="flex min-h-10 items-center sm:min-h-0 w-full sm:w-auto flex-shrink-0"
        >
          {item}
        </div>
      ))}
    </div>
  );
}
