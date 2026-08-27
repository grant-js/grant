/**
 * Project OAuth provider abstraction.
 * To add a new provider (e.g. Google): implement this interface, add the provider to
 * PROJECT_OAUTH_PROVIDERS in config (subset of UserAuthenticationMethodProvider from schema),
 * register it in the handler's provider registry, and add callback handling in the project callback route.
 */
export interface IProjectOAuthProvider {
  /**
   * Return the URL to redirect the user to (provider auth page or email entry page).
   *
   * May be async: a provider whose configuration includes a secret resolves it
   * through `ISecretResolver`, which is promise-based. Providers with nothing to
   * resolve stay synchronous.
   */
  getAuthorizeUrl(params: {
    clientId: string;
    redirectUri: string;
    stateId: string;
    clientState?: string;
    appName?: string;
  }): string | Promise<string>;
}
