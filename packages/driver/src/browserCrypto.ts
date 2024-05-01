export async function randomBytes(size: number): Promise<Uint8Array> {
  return crypto.getRandomValues(new Uint8Array(size));
}

export async function H(msg: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", msg));
}

export async function HMAC(
  key: Uint8Array,
  msg: Uint8Array
): Promise<Uint8Array> {
  return new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      await crypto.subtle.importKey(
        "raw",
        key,
        {
          name: "HMAC",
          hash: { name: "SHA-256" },
        },
        false,
        ["sign"]
      ),
      msg
    )
  );
}
