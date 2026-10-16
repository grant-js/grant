/**
 * The `enabledProviders` an edit of a project app may send (ADR 0011 § 5).
 *
 * The API reads an empty or null list as "every provider except password", so an empty
 * switch state is **not** "all off": persisting it would turn Email, GitHub and Google on
 * for an app that had only one of them (or only password) enabled. An edit therefore
 * cannot save an empty selection over a non-empty one. An app whose saved list is already
 * empty (the legacy "all" state) saves an empty selection as "leave the list unchanged".
 */
export type EnabledProvidersUpdate =
  { ok: true; enabledProviders: string[] | undefined } | { ok: false };

export function resolveEnabledProvidersUpdate(
  saved: readonly string[] | null | undefined,
  selected: readonly string[] | null | undefined
): EnabledProvidersUpdate {
  if (selected?.length) {
    return { ok: true, enabledProviders: [...selected] };
  }
  if (saved?.length) {
    return { ok: false };
  }
  return { ok: true, enabledProviders: undefined };
}
