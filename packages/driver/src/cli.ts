#!/usr/bin/env node
import { execSync } from "node:child_process";

function isEdgeDBCLIInstalled() {
  try {
    execSync("edgedb --version", { stdio: "ignore" });
    return true;
  } catch (error) {
    return false;
  }
}

function installEdgeDBCLI() {
  console.log("Installing EdgeDB CLI...");
  if (process.platform === "win32") {
    execSync("iwr https://ps1.edgedb.com -useb | iex", {
      stdio: "inherit",
      shell: "powershell",
    });
  } else {
    execSync("curl https://sh.edgedb.com --proto '=https' -sSf1 | sh", {
      stdio: "inherit",
    });
  }
}

function runEdgeDBCLI(args: string[]) {
  execSync(`edgedb ${args.join(" ")}`, { stdio: "inherit" });
}

function main(args: string[]) {
  if (!isEdgeDBCLIInstalled()) {
    installEdgeDBCLI();
  }

  runEdgeDBCLI(args);
}

main(process.argv.slice(2));
