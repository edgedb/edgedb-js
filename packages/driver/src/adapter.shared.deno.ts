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

const _Float16Array = Float16Array;
export { _Float16Array as Float16Array };

export function getFloat16(
  dataView: DataView,
  byteOffset: number,
  littleEndian?: boolean,
): number {
  return dataView.getFloat16(byteOffset, littleEndian);
}

export function setFloat16(
  dataView: DataView,
  byteOffset: number,
  value: number,
  littleEndian?: boolean,
): void {
  dataView.setFloat16(byteOffset, value, littleEndian);
}

export function isFloat16Array(value: unknown): value is Float16Array {
  return value instanceof Float16Array;
}
