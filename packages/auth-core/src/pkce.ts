import { bytesToBase64Url, sha256, randomBytes } from "./crypto";

export async function createVerifierChallengePair(): Promise<{
  verifier: string;
  challenge: string;
}> {
  const verifier = bytesToBase64Url(randomBytes(32));
  const challenge = await sha256(verifier).then(bytesToBase64Url);

  return { verifier, challenge };
}
