import { SecretsFactory } from '@grantjs/secrets';

import { config } from '@/config';
import { loggerFactory } from '@/lib/logger';

/**
 * Process-wide secret resolver, built from `SECRETS_PROVIDER`. Mirrors the
 * `loggerFactory` singleton in `@/lib/logger`: this module is the one place the
 * concrete adapter is chosen, and services receive the `ISecretResolver` port.
 *
 * Default provider is `env`, so this reads `process.env` exactly as the call
 * sites did before.
 */
export const secretResolver = SecretsFactory.create(config.secrets, loggerFactory);
