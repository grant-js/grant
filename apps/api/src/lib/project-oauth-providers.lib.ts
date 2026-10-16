import { PROJECT_PASSWORD_PROVIDER } from '@/config/env.config';

/**
 * Providers a project app only offers when its `enabledProviders` list names them.
 *
 * An empty or null list means "every provider" for the others (`email`, `github`,
 * `google`), as it always has. `password` is opt-in (ADR 0011 § 5): no existing app grows
 * a password form by having an empty list.
 */
const OPT_IN_PROVIDERS: ReadonlySet<string> = new Set([PROJECT_PASSWORD_PROVIDER]);

/**
 * Whether `provider` is enabled for an app with this `enabledProviders` list. Compares
 * case-insensitively, like the hosted sign-in page does.
 */
export function isProjectProviderEnabled(
  enabledProviders: readonly string[] | null | undefined,
  provider: string
): boolean {
  const wanted = provider.toLowerCase();
  const list = (enabledProviders ?? []).map((value) => value.toLowerCase());
  if (list.length === 0) {
    return !OPT_IN_PROVIDERS.has(wanted);
  }
  return list.includes(wanted);
}
