// Context and Provider
export { GrantProvider, useGrantClient, useGrantClientOptional } from './context';
export type { GrantProviderProps } from './context';

// Permission hooks
export { useGrant } from './hooks/useGrant';
export type { UseGrantOptions, UseGrantResult } from './hooks/useGrant';

// Components
export { GrantGate } from './components/GrantGate';
export type { GrantGateProps } from './components/GrantGate';

// Re-export core types for convenience
export type {
  GrantClientConfig,
  AuthTokens,
  AuthorizationResult,
  Permission,
  Scope,
} from '../types';

// Re-export GrantClient for advanced use cases
export { GrantClient } from '../grant-client';
