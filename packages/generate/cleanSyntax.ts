#!/usr/bin/env node

import _fs from "fs";
import path from "path";

const fs = _fs.promises;

const distSyntax = path.join(__dirname, "dist", "syntax");
const esmSyntax = path.join(__dirname, "dist", "__esm");

async function run() {
  console.log(`Cleaning up...`);
  console.log(`Removing ${esmSyntax}`);
  await fs.rm(esmSyntax, { recursive: true, force: true });
  console.log(`Removing ${distSyntax}`);
  await fs.rm(distSyntax, { recursive: true, force: true });
}
run();
