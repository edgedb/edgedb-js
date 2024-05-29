export function getEnv(
  envName: string,
  _required = false
): string | undefined {
  return process.env[envName];
}
