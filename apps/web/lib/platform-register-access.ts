export function canShowPlatformRegister(params: {
  publicSignupEnabled: boolean;
  bootstrapOpen: boolean;
  hasInvitation: boolean;
}): boolean {
  return params.hasInvitation || params.publicSignupEnabled || params.bootstrapOpen;
}
