import process from "node:process";
export function getEnv(
  envName: string,
  required: boolean = false
): string | undefined {
  return process.env[envName];
}
