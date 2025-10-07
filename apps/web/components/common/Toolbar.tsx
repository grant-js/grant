import { ReactNode } from 'react';

export interface ToolbarProps {
  items: ReactNode[];
}

export function Toolbar({ items }: ToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
      {items.map((item, index) => (
        <div key={index} className="w-full sm:w-auto">
          {item}
        </div>
      ))}
    </div>
  );
}
