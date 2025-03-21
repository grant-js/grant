import { ReactNode, ReactElement } from 'react';
import React from 'react';

interface DashboardPageTitleProps {
  title: string;
  actions?: ReactNode;
}

interface IconProps {
  name?: string;
  className?: string;
  children?: ReactNode;
}

export function DashboardPageTitle({ title, actions }: DashboardPageTitleProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-xl sm:text-2xl font-bold">{title}</h2>
      {actions && (
        <div className="flex items-center">
          <div className="sm:hidden">
            {/* Mobile: Show only the icon */}
            {React.Children.map(actions, (child) => {
              if (React.isValidElement(child)) {
                const element = child as ReactElement<IconProps>;
                return React.cloneElement(element, {
                  ...element.props,
                  className: `${element.props.className || ''} h-9 w-9 p-0`,
                  children: React.Children.toArray(element.props.children).find(
                    (c) => React.isValidElement(c) && (c as ReactElement).type === 'svg'
                  ),
                });
              }
              return child;
            })}
          </div>
          <div className="hidden sm:block">
            {/* Desktop: Show full button */}
            {actions}
          </div>
        </div>
      )}
    </div>
  );
}
