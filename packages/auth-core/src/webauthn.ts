import { base64UrlToBytes, bytesToBase64Url } from "./crypto";
import { webAuthnProviderName } from "./consts";
import { requestGET, requestPOST } from "./utils";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  SignupResponse,
  TokenData,
} from "./types";

interface WebAuthnClientOptions {
  signupOptionsUrl: string;
  signupUrl: string;
  signinOptionsUrl: string;
  signinUrl: string;
  verifyUrl: string;
}

export class WebAuthnClient {
  private readonly signupOptionsUrl: string;
  private readonly signupUrl: string;
  private readonly signinOptionsUrl: string;
  private readonly signinUrl: string;
  private readonly verifyUrl: string;

  constructor(options: WebAuthnClientOptions) {
    this.signupOptionsUrl = options.signupOptionsUrl;
    this.signupUrl = options.signupUrl;
    this.signinOptionsUrl = options.signinOptionsUrl;
    this.signinUrl = options.signinUrl;
    this.verifyUrl = options.verifyUrl;
  }

  public async signUp(email: string): Promise<SignupResponse> {
    const options = await requestGET<PublicKeyCredentialCreationOptionsJSON>(
      this.signupOptionsUrl,
      { email },
      async (errorMessage) => {
        throw new Error(`Failed to get sign-up options: ${errorMessage}`);
      }
    );

    const userHandle = options.user.id;
    const credentials = (await navigator.credentials.create({
      publicKey: {
        ...options,
        challenge: base64UrlToBytes(options.challenge),
        user: {
          ...options.user,
          id: base64UrlToBytes(userHandle),
        },
        excludeCredentials: options.excludeCredentials?.map((credential) => ({
          ...credential,
          id: base64UrlToBytes(credential.id),
        })),
      },
    })) as PublicKeyCredential | null;

    if (!credentials) {
      throw new Error("Failed to create credentials");
    }

    const credentialsResponse =
      credentials.response as AuthenticatorAttestationResponse;
    const encodedCredentials = {
      authenticatorAttachment: credentials.authenticatorAttachment,
      clientExtensionResults: credentials.getClientExtensionResults(),
      id: credentials.id,
      rawId: bytesToBase64Url(new Uint8Array(credentials.rawId)),
      response: {
        ...credentialsResponse,
        attestationObject: bytesToBase64Url(
          new Uint8Array(credentialsResponse.attestationObject)
        ),
        clientDataJSON: bytesToBase64Url(
          new Uint8Array(credentialsResponse.clientDataJSON)
        ),
      },
      type: credentials.type,
    };

    return await requestPOST<SignupResponse>(
      this.signupUrl,
      {
        email,
        credentials: encodedCredentials,
        provider: webAuthnProviderName,
        verify_url: this.verifyUrl,
        user_handle: userHandle,
      },
      async (errorMessage) => {
        throw new Error(`Failed to sign up: ${errorMessage}`);
      }
    );
  }

  async signIn(email: string): Promise<void> {
    const options = await requestGET<PublicKeyCredentialRequestOptionsJSON>(
      this.signinOptionsUrl,
      { email },
      async (errorMessage) => {
        throw new Error(`Failed to get sign-in options: ${errorMessage}`);
      }
    );

    const assertion = (await navigator.credentials.get({
      publicKey: {
        ...options,
        challenge: base64UrlToBytes(options.challenge),
        allowCredentials: options.allowCredentials?.map((credential) => ({
          ...credential,
          id: base64UrlToBytes(credential.id),
        })),
      },
    })) as PublicKeyCredential;

    if (!assertion) {
      throw new Error("Failed to sign in");
    }

    const assertionResponse =
      assertion.response as AuthenticatorAssertionResponse;

    const encodedAssertion = {
      type: assertion.type,
      id: assertion.id,
      authenticatorAttachments: assertion.authenticatorAttachment,
      clientExtensionResults: assertion.getClientExtensionResults(),
      rawId: bytesToBase64Url(new Uint8Array(assertion.rawId)),
      response: {
        authenticatorData: bytesToBase64Url(
          new Uint8Array(assertionResponse.authenticatorData)
        ),
        clientDataJSON: bytesToBase64Url(
          new Uint8Array(assertionResponse.clientDataJSON)
        ),
        signature: bytesToBase64Url(
          new Uint8Array(assertionResponse.signature)
        ),
        userHandle: assertionResponse.userHandle
          ? bytesToBase64Url(new Uint8Array(assertionResponse.userHandle))
          : null,
      },
    };

    await requestPOST(
      this.signinUrl,
      {
        email,
        assertion: encodedAssertion,
        verify_url: this.verifyUrl,
        provider: webAuthnProviderName,
      },
      (errorMessage: string) => {
        throw new Error(`Failed to sign in: ${errorMessage}`);
      }
    );
  }
}
