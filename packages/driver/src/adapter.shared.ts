export {
  Float16Array,
  getFloat16,
  isFloat16Array,
  setFloat16,
} from "@petamoriken/float16";

export function getEnv(envName: string, _required = false): string | undefined {
  return process.env[envName];
}
