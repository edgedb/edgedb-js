import crypto from "node:crypto";

export function createVerifierChallengePair(): {
  verifier: string;
  challenge: string;
} {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");

  return { verifier, challenge };
}
