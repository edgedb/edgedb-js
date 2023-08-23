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
