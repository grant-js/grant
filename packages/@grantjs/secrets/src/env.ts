import type { ISecretResolver } from '@grantjs/core';

/**
 * Resolves secrets from `process.env`. This is the default on every deployment
 * target and reproduces the platform's historical behavior exactly: values
 * arrive through the `@grantjs/env` file hierarchy, a container runtime, or the
 * shell, and are read straight off the process environment.
 */
export class EnvSecretResolver implements ISecretResolver {
  resolve(name: string): Promise<string | undefined> {
    const value = process.env[name];
    // Empty and unset are the same thing to every caller: the env schema defaults
    // secret keys to '', and both call sites test truthiness. Normalizing here keeps
    // `undefined` meaning "not configured" across all implementations.
    return Promise.resolve(value ? value : undefined);
  }
}
