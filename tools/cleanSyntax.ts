#!/usr/bin/env node

// tslint:disable:no-console

import _fs from "fs";
import path from "path";

const fs = _fs.promises;

const distSyntax = path.join(__dirname, "..", "dist", "syntax");
const esmSyntax = path.join(__dirname, "..", "dist", "__esm", "syntax");

async function run() {
  console.log(`Cleaning up...`);
  const mockSyntax = path.join(__dirname, "..", "dist", "syntax", "genMock");
  console.log(`Removing ${mockSyntax}`);
  await fs.rm(mockSyntax, {recursive: true, force: true});
  console.log(`Removing ${esmSyntax}`);
  await fs.rm(esmSyntax, {recursive: true, force: true});
  console.log(`Removing ${distSyntax}`);
  await fs.rm(distSyntax, {recursive: true, force: true});
}
run();
