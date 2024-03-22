#!/usr/bin/env node
import { execSync } from "node:child_process";
import https from "node:https";
import { createWriteStream, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

function downloadAndWriteScript(
  url: string,
  filePath: string,
  callback: (err?: Error | null) => void
) {
  const fileStream = createWriteStream(filePath);
  const request = https.get(url, (response) => {
    response.pipe(fileStream);
    fileStream.on("finish", () => {
      fileStream.close(callback); // Call the callback function once the stream is closed
    });
  });

  request.on("error", (err) => {
    console.error("Error downloading the script:", err);
    unlinkSync(filePath); // Delete the file in case of any error during the download
    process.exit(1);
  });

  fileStream.on("error", (err) => {
    console.error("Error writing the script to disk:", err);
    unlinkSync(filePath);
    process.exit(1);
  });
}

function installEdgeDBCLI() {
  console.log("Installing EdgeDB CLI...");

  const url =
    process.platform === "win32"
      ? "https://ps1.edgedb.com"
      : "https://sh.edgedb.com";
  const scriptPath = path.join(tmpdir(), "temp_install_script.sh");

  downloadAndWriteScript(url, scriptPath, (closeError) => {
    if (closeError) {
      console.error("Error downloading the script:", closeError);
      process.exit(1);
    }

    if (process.platform === "win32") {
      execSync(
        `powershell -Command "iex (Get-Content ${scriptPath} | Out-String)"`,
        {
          stdio: "inherit",
        }
      );
    } else {
      execSync(`sh ${scriptPath}`, {
        stdio: "inherit",
      });
    }

    // Clean up the temporary script file
    unlinkSync(scriptPath);
  });
}

function isEdgeDbCliInstalled() {
  try {
    execSync("edgedb --version", { stdio: "ignore" });
    return true;
  } catch (error) {
    return false;
  }
}

function runEdgeDbCli(args: string[]) {
  execSync(`edgedb ${args.join(" ")}`, { stdio: "inherit" });
}

function main(args: string[]) {
  if (!isEdgeDbCliInstalled()) {
    installEdgeDBCLI();
  }

  runEdgeDbCli(args);
}

main(process.argv.slice(2));
