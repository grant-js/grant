import {
  PROJECT_OAUTH_CONNECTION_SECRET_PURPOSE,
  type SealedSecret,
  sealSecret,
  unsealSecret,
} from './sealed-secret.lib';

export function encryptProjectOAuthConnectionSecret(secret: string, key: string): SealedSecret {
  return sealSecret(secret, key, PROJECT_OAUTH_CONNECTION_SECRET_PURPOSE);
}

export function decryptProjectOAuthConnectionSecret(
  params: SealedSecret & { key: string }
): string {
  return unsealSecret(params, params.key, PROJECT_OAUTH_CONNECTION_SECRET_PURPOSE);
}
