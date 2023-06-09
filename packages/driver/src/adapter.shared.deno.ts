export async function randomBytes(size: number): Promise<Uint8Array> {
  const buf = new Uint8Array(size);
  return crypto.getRandomValues(buf);
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

export function getEnv(envName: string, required = false): string | undefined {
  if (!required) {
    const state = Deno.permissions.querySync({
      name: "env",
      variable: envName,
    }).state;
    if (state !== "granted") {
      return undefined;
    }
  }
  return Deno.env.get(envName);
}
