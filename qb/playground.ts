// tslint:disable:no-console
import {setupTests} from "./test/setupTeardown";
import e from "./dbschema/edgeql-js";
import {Range} from "edgedb";
import {ReadBuffer} from "../src/primitives/buffer";

function parseWithoutDashes(buffer: ReadBuffer) {
  return buffer.readBuffer(16).toString("hex");
}

function parseWithDashes(buffer: ReadBuffer) {
  return `${buffer.readBuffer(4).toString("hex")}-${buffer
    .readBuffer(2)
    .toString("hex")}-${buffer.readBuffer(2).toString("hex")}-${buffer
    .readBuffer(2)
    .toString("hex")}-${buffer.readBuffer(6).toString("hex")}`;
}

function parseWithDashesInterpolation(buffer: ReadBuffer) {
  const buf = buffer.readBuffer(16).toString("hex");
  return `${buf.slice(0, 8)}-${buf.slice(8, 12)}-${buf.slice(
    12,
    16
  )}-${buf.slice(16, 20)}-${buf.slice(20)}`;
}

function parseWithDashesStringAddition(buffer: ReadBuffer) {
  const buf = buffer.readBuffer(16).toString("hex");

  return (
    buf.slice(0, 8) +
    "-" +
    buf.slice(8, 12) +
    "-" +
    buf.slice(12, 16) +
    "-" +
    buf.slice(16, 20) +
    "-" +
    buf.slice(20)
  );
}

const byteToHex: string[] = [];

for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 0x100).toString(16).slice(1));
}

export function parseWithByteToHex(buf: Buffer) {
  const arr = new Uint8Array(buf);
  return (
    byteToHex[arr[0]] +
    byteToHex[arr[1]] +
    byteToHex[arr[2]] +
    byteToHex[arr[3]] +
    "-" +
    byteToHex[arr[4]] +
    byteToHex[arr[5]] +
    "-" +
    byteToHex[arr[6]] +
    byteToHex[arr[7]] +
    "-" +
    byteToHex[arr[8]] +
    byteToHex[arr[9]] +
    "-" +
    byteToHex[arr[10]] +
    byteToHex[arr[11]] +
    byteToHex[arr[12]] +
    byteToHex[arr[13]] +
    byteToHex[arr[14]] +
    byteToHex[arr[15]]
  ).toLowerCase();
}

export function parseWithByteToHex2(arr: Buffer) {
  return (
    byteToHex[arr[0]] +
    byteToHex[arr[1]] +
    byteToHex[arr[2]] +
    byteToHex[arr[3]] +
    "-" +
    byteToHex[arr[4]] +
    byteToHex[arr[5]] +
    "-" +
    byteToHex[arr[6]] +
    byteToHex[arr[7]] +
    "-" +
    byteToHex[arr[8]] +
    byteToHex[arr[9]] +
    "-" +
    byteToHex[arr[10]] +
    byteToHex[arr[11]] +
    byteToHex[arr[12]] +
    byteToHex[arr[13]] +
    byteToHex[arr[14]] +
    byteToHex[arr[15]]
  );
}

async function run() {
  const d = await setupTests();
  const res = await d.client.queryRequiredSingle<string>(
    `SELECT uuid_generate_v1mc();`
  );
  const uuidRegex =
    /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/;
  console.log(`is uuid`);
  console.log(uuidRegex.test(res));

  const RUNS = 1;
  console.time("without-dashes");
  for (let i = 0; i < RUNS; i++) {
    const testBuffer = new ReadBuffer(
      Buffer.from("a42599e903dc48e3abb7501b7f8543f5", "hex")
    );
    parseWithoutDashes(testBuffer);
  }
  console.timeEnd("without-dashes");

  console.time("with-dashes-readbuffer");
  for (let i = 0; i < RUNS; i++) {
    const testBuffer = new ReadBuffer(
      Buffer.from("a42599e903dc48e3abb7501b7f8543f5", "hex")
    );
    parseWithDashes(testBuffer);
  }
  console.timeEnd("with-dashes-readbuffer");

  console.time("with-dashes-string-manip");
  for (let i = 0; i < RUNS; i++) {
    const testBuffer = new ReadBuffer(
      Buffer.from("a42599e903dc48e3abb7501b7f8543f5", "hex")
    );
    parseWithDashesInterpolation(testBuffer);
  }
  console.timeEnd("with-dashes-string-manip");

  console.time("with-dashes-string-addition");
  for (let i = 0; i < RUNS; i++) {
    const testBuffer = new ReadBuffer(
      Buffer.from("a42599e903dc48e3abb7501b7f8543f5", "hex")
    );
    parseWithDashesStringAddition(testBuffer);
  }
  console.timeEnd("with-dashes-string-addition");

  console.time("with-dashes-bytetohex");
  for (let i = 0; i < RUNS; i++) {
    const testBuffer = new ReadBuffer(
      Buffer.from("A42599e903dc48e3abb7501b7f8543f5", "hex")
    );
    parseWithByteToHex(testBuffer.readBuffer(16));
  }
  console.timeEnd("with-dashes-bytetohex");

  console.time("with-dashes-bytetohex2");
  for (let i = 0; i < RUNS; i++) {
    const testBuffer = new ReadBuffer(
      Buffer.from("A42599E903dc48e3aBB7501b7f8543f5", "hex")
    );
    parseWithByteToHex2(testBuffer.readBuffer(16));
  }
  console.timeEnd("with-dashes-bytetohex2");
}

run();
export {};
