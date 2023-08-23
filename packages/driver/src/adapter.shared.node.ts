export function getEnv(
  envName: string,
  required: boolean = false
): string | undefined {
  return process.env[envName];
}
