/**
 * The name a person gets when Grant creates them without a name of their own: the part of the
 * address before `@` for an e-mail identity, else this placeholder. A Google or GitHub sign-up
 * uses the provider's profile name instead (`UserAuthenticationMethodService.processProvider`).
 *
 * One rule for every path that creates or hands over a user, so a person who signs up, is
 * created by a CDM import, or takes over an imported identity sees the same name as if Grant
 * had never known them. An import's own name for the person is the project's display name,
 * never this one.
 */
export const DEFAULT_USER_NAME = 'User';

export function signUpNameFromEmail(email: string): string {
  return email.split('@')[0] || DEFAULT_USER_NAME;
}
