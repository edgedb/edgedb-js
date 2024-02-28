import { base64UrlToBytes, bytesToBase64Url } from "./crypto";
import { webAuthnProviderName } from "./consts";
import { requestGET, requestPOST } from "./utils";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
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

  public async signUp(email: string): Promise<{ code?: string }> {
    const options = await requestGET<PublicKeyCredentialCreationOptionsJSON>(
      this.signupOptionsUrl,
      { email },
      async (errorMessage) => {
        throw new Error(`Failed to get sign-up options: ${errorMessage}`);
      }
    );

    const credentials = await navigator.credentials.create({
      publicKey: {
        ...options,
        challenge: base64UrlToBytes(options.challenge),
        user: {
          ...options.user,
          id: base64UrlToBytes(options.user.id),
        },
        excludeCredentials: options.excludeCredentials?.map((credential) => ({
          ...credential,
          id: base64UrlToBytes(credential.id),
        })),
      },
    });

    return await requestPOST<{ code?: string }>(
      this.signupUrl,
      {
        email,
        credentials,
        provider: webAuthnProviderName,
        verify_url: this.verifyUrl,
      },
      async (errorMessage) => {
        throw new Error(`Failed to sign up: ${errorMessage}`);
      }
    );
  }

  async signIn(email: string): Promise<{ code?: string }> {
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
      ...assertion,
      rawId: bytesToBase64Url(new Uint8Array(assertion.rawId)),
      response: {
        ...assertion.response,
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

    return await requestPOST<{ code?: string }>(
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
