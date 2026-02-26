import { type ReactNode } from 'react';

import { z } from 'zod';

export interface BaseEntity {
  id: string;
  [key: string]: any;
}

export interface AvatarProps {
  initial: string;
  imageUrl?: string;
  cacheBuster?: string | Date | null;
  size?: 'sm' | 'md' | 'lg';
  shape?: 'circle' | 'squircle';
  className?: string;
  fallbackClassName?: string;
  icon?: ReactNode;
}

export interface SkeletonConfig {
  component: ReactNode;
  count: number;
}

export type DialogFieldType =
  | 'text'
  | 'email'
  | 'textarea'
  | 'date'
  | 'switch'
  | 'collapsible-group'
  | 'slug'
  | 'actions'
  | 'select'
  | 'json';

export interface DialogFieldOption {
  value: string;
  label: string;
  /** Optional description shown below the label (e.g. for role selector) */
  description?: string;
  /** When true, option is not selectable (e.g. role hierarchy) */
  disabled?: boolean;
}

export interface DialogRelationship<T = unknown> {
  name: string;
  label: string;
  items: T[];
  loading: boolean;
  loadingText: string;
  emptyText: string;
  error?: string;
  renderComponent: (props: any) => React.ReactNode;
}

export interface DialogField {
  name: string;
  label: string;
  placeholder?: string;
  type: DialogFieldType;
  validation?: z.ZodString;
  required?: boolean;
  autoSlugifyFrom?: string;
  info?: string;
  /** Optional external docs link shown in the info popover (e.g. for syntax reference) */
  infoLink?: { href: string; label?: string };
  /** When set, this field is only shown when the named field equals the given value (e.g. for toggleable json fields) */
  showWhen?: { field: string; value: boolean };
  /** When set, this field is rendered inside the named collapsible-group (not as a standalone field) */
  partOfCollapsible?: string;
  /** For type 'collapsible-group': the name of the field to render inside the collapsible content */
  contentField?: string;
  options?: DialogFieldOption[];
  dependsOn?: string;
  getOptions?: (dependsOnValue: string) => DialogFieldOption[];
  getType?: (dependsOnValue: string) => DialogFieldType;
}
