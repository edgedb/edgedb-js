// @ts-ignore
const isDeno = typeof Deno !== "undefined";

let Float16Array: any;
let getFloat16: (
  dataView: DataView,
  byteOffset: number,
  littleEndian?: boolean,
) => number;
let setFloat16: (
  dataView: DataView,
  byteOffset: number,
  value: number,
  littleEndian?: boolean,
) => void;
let isFloat16Array: (value: unknown) => boolean;
let getEnv: (envName: string, required?: boolean) => string | undefined;

if (isDeno) {
  // @ts-ignore
  Float16Array = globalThis.Float16Array;

  getFloat16 = (dataView, byteOffset, littleEndian) =>
    // @ts-ignore
    dataView.getFloat16(byteOffset, littleEndian);

  setFloat16 = (dataView, byteOffset, value, littleEndian) =>
    // @ts-ignore
    dataView.setFloat16(byteOffset, value, littleEndian);

  isFloat16Array = (value) => value instanceof Float16Array;

  getEnv = (envName, required = false) => {
    if (!required) {
      // @ts-ignore
      const state = Deno.permissions.querySync({
        name: "env",
        variable: envName,
      }).state;
      if (state !== "granted") return undefined;
    }
    // @ts-ignore
    return Deno.env.get(envName);
  };
} else {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const float16 = require("@petamoriken/float16");
  Float16Array = float16.Float16Array;
  getFloat16 = float16.getFloat16;
  setFloat16 = float16.setFloat16;
  isFloat16Array = float16.isFloat16Array;

  getEnv = (envName, _required = false) => process.env[envName];
}

export { Float16Array, getFloat16, setFloat16, isFloat16Array, getEnv };
