export function getEnv(
  envName: string,
  _required: boolean = false
): string | undefined {
  return process.env[envName];
}
