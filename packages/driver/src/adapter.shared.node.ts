export function getEnv(envName: string): string | undefined {
  return process.env[envName];
}
