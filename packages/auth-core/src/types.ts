export interface PublicKeyCredentialCreationOptionsJSON {
  rp: PublicKeyCredentialRpEntity;
  user: PublicKeyCredentialUserEntityJSON;
  challenge: Base64URLString;
  pubKeyCredParams: PublicKeyCredentialParameters[];
  timeout?: number;
  excludeCredentials?: PublicKeyCredentialDescriptorJSON[];
  authenticatorSelection?: AuthenticatorSelectionCriteria;
  attestation?: AttestationConveyancePreference;
  extensions?: AuthenticationExtensionsClientInputs;
}

export interface PublicKeyCredentialRequestOptionsJSON {
  challenge: Base64URLString;
  timeout?: number;
  rpId?: string;
  allowCredentials?: PublicKeyCredentialDescriptorJSON[];
  userVerification?: UserVerificationRequirement;
  extensions?: AuthenticationExtensionsClientInputs;
}

export interface RegistrationResponseJSON {
  id: Base64URLString;
  rawId: Base64URLString;
  response: AuthenticatorAttestationResponseJSON;
  authenticatorAttachment?: AuthenticatorAttachment;
  clientExtensionResults: AuthenticationExtensionsClientOutputs;
  type: PublicKeyCredentialType;
}

export interface AuthenticationResponseJSON {
  id: Base64URLString;
  rawId: Base64URLString;
  response: AuthenticatorAssertionResponseJSON;
  authenticatorAttachment?: AuthenticatorAttachment;
  clientExtensionResults: AuthenticationExtensionsClientOutputs;
  type: PublicKeyCredentialType;
}

type Base64URLString = string;

export interface PublicKeyCredentialUserEntityJSON {
  id: Base64URLString;
  name: string;
  displayName: string;
}

export interface PublicKeyCredentialDescriptorJSON {
  id: Base64URLString;
  type: PublicKeyCredentialType;
  transports?: AuthenticatorTransport[];
}

export interface AuthenticatorAttestationResponseJSON {
  clientDataJSON: Base64URLString;
  attestationObject: Base64URLString;
  // Optional in L2, but becomes required in L3. Play it safe until L3 becomes Recommendation
  authenticatorData?: Base64URLString;
  // Optional in L2, but becomes required in L3. Play it safe until L3 becomes Recommendation
  transports?: AuthenticatorTransport[];
  // Optional in L2, but becomes required in L3. Play it safe until L3 becomes Recommendation
  publicKeyAlgorithm?: COSEAlgorithmIdentifier;
  publicKey?: Base64URLString;
}

export interface AuthenticatorAssertionResponseJSON {
  clientDataJSON: Base64URLString;
  authenticatorData: Base64URLString;
  signature: Base64URLString;
  userHandle?: string;
}
