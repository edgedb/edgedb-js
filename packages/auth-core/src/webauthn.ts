import { base64UrlToBytes, bytesToBase64Url } from "./crypto";
import { webAuthnProviderName } from "./consts";
import { type Serialized, requestGET, requestPOST } from "./utils";

export class WebAuthnClient {
  private readonly signupOptionsUrl: string;
  private readonly signupUrl: string;
  private readonly signinOptionsUrl: string;
  private readonly signinUrl: string;

  constructor(
    public readonly baseUrl: string,
    public readonly verifyUrl: string
  ) {
    this.signupOptionsUrl = `${baseUrl}/webauthn/signup/options`;
    this.signupUrl = `${baseUrl}/webauthn/signup`;
    this.signinOptionsUrl = `${baseUrl}/webauthn/signin/options`;
    this.signinUrl = `${baseUrl}/webauthn/signin`;
  }

  public async signUp(email: string): Promise<{ code?: string }> {
    const options = await requestGET<
      Serialized<PublicKeyCredentialCreationOptions>
    >(this.signupOptionsUrl, { email }, async (errorMessage) => {
      throw new Error(`Failed to get sign-up options: ${errorMessage}`);
    });

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
    const options = await requestGET<
      Serialized<PublicKeyCredentialRequestOptions>
    >(this.signinOptionsUrl, { email }, async (errorMessage) => {
      throw new Error(`Failed to get sign-in options: ${errorMessage}`);
    });

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
