/**
 * Shared data types used across repositories, handlers, and services.
 * These are pure type definitions with no service/business logic.
 */

import type { Token } from '@/lib/token.lib';

export type DeleteParams = {
  hardDelete?: boolean;
};

export type SelectedFields<T> = {
  requestedFields?: Array<keyof T>;
};

export type Otp = Token;
