/**
 * A configuration error an adopter can act on.
 *
 * Deliberately local rather than `@grantjs/core`'s `ConfigurationError`. This package
 * is the deployment artifact: an adopter installs `aws-cdk-lib` and runs `cdk synth`,
 * and taking a workspace dependency on the platform's domain core to throw a
 * differently-named error would drag an unrelated package graph into that. Same
 * structural reasoning AGENTS.md records for `@grantjs/env` and the published trio.
 */
export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}
