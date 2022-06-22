#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";

async function run() {
  const syntaxPath = path.join(__dirname, "..", "src", "syntax");
  const syntaxFiles = await fs.readdir(syntaxPath);
  for (const _file of syntaxFiles) {
    const file = path.join(syntaxPath, _file);
    if (!file.endsWith(".ts")) continue;
    // const importRegex = /from "\.([_A-Z0-9a-z\/\.\@]+)";/g;

    // generete .mts
    const mtsContents = await fs.readFile(file, "utf8");
    const mtsModified = mtsContents; //.replace(importRegex, `from ".$1.mjs";`);
    const mtsPath = path.join(
      __dirname,
      "..",
      "dist",
      "syntax",
      _file.replace(".ts", ".mts")
    );

    await fs.writeFile(mtsPath, mtsModified, "utf-8");
  }

  // const cjsPath = path.join(__dirname, "..", "dist","__esm",  "syntax");
  // const cjsSyntaxFiles = await fs.readdir(cjsPath);
  // for (const _file of cjsSyntaxFiles) {
  //   const file = path.join(cjsPath, _file);
  //   if (!file.endsWith(".ts")) continue;
  //   const importRegex = /from "\.([_A-Z0-9a-z\/\.\@]+)";/g;

  //   // generete .mts
  //   const mtsContents = await fs.readFile(file, "utf8");
  //   const mtsModified = mtsContents.replace(importRegex, `from ".$1.mjs";`);
  //   const mtsPath = path.join(
  //     __dirname,
  //     "..",
  //     "dist",
  //     "syntax",
  //     _file.replace(".ts", ".mts")
  //   );
  //   console.log(`writing ${mtsPath}`);
  //   await fs.writeFile(mtsPath, mtsModified, "utf-8");
  // }
}
run();
