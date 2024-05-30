#!/usr/bin/env node
import { execSync, type ExecSyncOptions } from "node:child_process";
import { createWriteStream } from "node:fs";
import * as os from "node:os";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as process from "node:process";
import * as semver from "semver";
import envPaths from "env-paths";
import Debug from "debug";
import which from "which";
import { quote } from "shell-quote";

const debug = Debug("edgedb:cli");

const IS_TTY = process.stdout.isTTY;
const SCRIPT_LOCATION = await fs.realpath(fileURLToPath(import.meta.url));
const EDGEDB_PKG_ROOT = "https://packages.edgedb.com";
const CACHE_DIR = envPaths("edgedb").cache;
const TEMPORARY_CLI_PATH = path.join(CACHE_DIR, "/edgedb-cli");
const CLI_LOCATION_CACHE_FILE_PATH = path.join(CACHE_DIR, "/cli-location");

interface Package {
  name: string;
  version: string;
  revision: string;
  installref: string;
}

debug("Process argv:", process.argv);
// n.b. Using `npx`, the 3rd argument is the script name, unlike
// `node` where the 2nd argument is the script name.
let args = process.argv.slice(2);
if (args[0] === "edgedb") {
  args = args.slice(1);
}
await main(args);

async function main(args: string[]) {
  debug(`Running CLI wrapper from: ${fileURLToPath(import.meta.url)}`);
  debug("Starting main function with args:", args);
  debug(`  - IS_TTY: ${IS_TTY}`);
  debug(`  - SCRIPT_LOCATION: ${SCRIPT_LOCATION}`);
  debug(`  - EDGEDB_PKG_ROOT: ${EDGEDB_PKG_ROOT}`);
  debug(`  - CACHE_DIR: ${CACHE_DIR}`);
  debug(`  - TEMPORARY_CLI_PATH: ${TEMPORARY_CLI_PATH}`);
  debug(`  - CLI_LOCATION_CACHE_FILE_PATH: ${CLI_LOCATION_CACHE_FILE_PATH}`);

  // check to see if we are being tested as a CLI binary wrapper
  if (args.length === 1 && args[0] === "--succeed-if-cli-bin-wrapper") {
    process.exit(0);
  }

  const maybeCachedCliLocation = await getCliLocationFromCache();
  const cliLocation =
    maybeCachedCliLocation ??
    (await whichEdgeDbCli()) ??
    (await getCliLocationFromTempCli()) ??
    (await selfInstallFromTempCli()) ??
    null;

  if (cliLocation === null) {
    throw Error("Failed to find or install EdgeDB CLI.");
  }

  try {
    runEdgeDbCli(args, cliLocation);
    if (cliLocation !== maybeCachedCliLocation) {
      debug("CLI location not cached.");
      debug(`  - Cached location: ${maybeCachedCliLocation}`);
      debug(`  - CLI location: ${cliLocation}`);
      debug(`Updating cache with new CLI location: ${cliLocation}`);
      await writeCliLocationToCache(cliLocation);
      debug("Cache updated.");
    }
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "status" in err &&
      typeof err.status === "number"
    ) {
      process.exit(err.status);
    } else {
      console.error(err);
    }

    process.exit(1);
  }

  process.exit(0);
}

async function whichEdgeDbCli() {
  debug("Checking if CLI is in PATH...");
  const locations = await which("edgedb", { nothrow: true, all: true });
  for (const location of locations) {
    const actualLocation = await fs.realpath(location);
    debug(
      `  - CLI found in PATH at: ${location} (resolved to: ${actualLocation})`,
    );

    if (actualLocation === SCRIPT_LOCATION) {
      debug("  - CLI found in PATH is the current script. Ignoring.");
      continue;
    }

    const lowerCaseLocation = actualLocation.toLowerCase();
    // n.b. Windows package binaries are actual scripts
    if (
      lowerCaseLocation.endsWith(".cmd") ||
      lowerCaseLocation.endsWith(".ps1")
    ) {
      debug("  - CLI found in PATH is a Windows script. Ignoring.");
      continue;
    }

    // n.b. pnpm uses a shell script for package binaries instead of symlinks
    if (lowerCaseLocation.includes("node_modules/.bin")) {
      debug(
        "  - CLI found in PATH is in a node_modules/.bin directory. Ignoring.",
      );
      continue;
    }

    try {
      runEdgeDbCli(["--succeed-if-cli-bin-wrapper"], actualLocation, {
        stdio: "ignore",
      });
      debug("  - CLI found in PATH is wrapper script. Ignoring.");
      continue;
    } catch (_err) {
      debug("  - CLI found in PATH is not a wrapper script. Using.");
    }

    return location;
  }
  debug("  - No CLI found in PATH.");
  return null;
}

async function getCliLocationFromCache(): Promise<string | null> {
  debug("Checking CLI cache...");
  try {
    let cachedBinaryPath: string | null = null;
    try {
      cachedBinaryPath = (
        await fs.readFile(CLI_LOCATION_CACHE_FILE_PATH, { encoding: "utf8" })
      ).trim();
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        err.code === "ENOENT"
      ) {
        debug("  - Cache file does not exist.");
      } else if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        err.code === "EACCES"
      ) {
        debug("  - No permission to read cache file.");
      }
      return null;
    }
    debug("  - CLI path in cache at:", cachedBinaryPath);

    try {
      await fs.access(cachedBinaryPath, fs.constants.F_OK);
      debug("  - CLI binary found in path:", cachedBinaryPath);
      return cachedBinaryPath;
    } catch (err) {
      debug("  - No CLI found in cache.", err);
      return null;
    }
  } catch (err) {
    debug("  - Cache file cannot be read.", err);
    return null;
  }
}

async function getCliLocationFromTempCli(): Promise<string | null> {
  debug("Installing temporary CLI to get install directory...");
  await downloadCliPackage();

  const installDir = getInstallDir(TEMPORARY_CLI_PATH);
  const binaryPath = path.join(installDir, "edgedb");
  await writeCliLocationToCache(binaryPath);
  debug("  - CLI installed at:", binaryPath);

  try {
    debug("  - CLI binary found in path:", binaryPath);
    await fs.access(binaryPath, fs.constants.F_OK);
    return binaryPath;
  } catch {
    debug("  - CLI binary not found in path:", binaryPath);
    return null;
  }
}

async function writeCliLocationToCache(cliLocation: string) {
  debug("Writing CLI location to cache:", cliLocation);
  const dir = path.dirname(CLI_LOCATION_CACHE_FILE_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(CLI_LOCATION_CACHE_FILE_PATH, cliLocation, {
    encoding: "utf8",
  });
}

async function selfInstallFromTempCli(): Promise<string | null> {
  debug("Self-installing EdgeDB CLI...");
  const cmd = IS_TTY ? ["_self_install"] : ["_self_install", "--quiet"];
  runEdgeDbCli(cmd, TEMPORARY_CLI_PATH);
  debug("  - CLI self-installed successfully.");
  return getCliLocationFromCache();
}

async function downloadCliPackage() {
  if (IS_TTY) {
    console.log("No EdgeDB CLI found, downloading CLI package...");
  }
  debug("Downloading CLI package...");
  const cliPkg = await findPackage();
  const downloadDir = path.dirname(TEMPORARY_CLI_PATH);
  await fs.mkdir(downloadDir, { recursive: true }).catch((error) => {
    if (error.code !== "EEXIST") throw error;
  });
  const downloadUrl = new URL(cliPkg.installref, EDGEDB_PKG_ROOT);
  await downloadFile(downloadUrl, TEMPORARY_CLI_PATH);
  debug("  - CLI package downloaded to:", TEMPORARY_CLI_PATH);

  const fd = await fs.open(TEMPORARY_CLI_PATH, "r+");
  await fd.chmod(0o755);
  await fd.datasync();
  await fd.close();
}

function runEdgeDbCli(
  args: string[],
  pathToCli: string,
  execOptions: ExecSyncOptions = { stdio: "inherit" },
) {
  const command = quote([pathToCli, ...args]);
  debug(`Running EdgeDB CLI: ${command}`);
  return execSync(command, execOptions);
}

async function findPackage(): Promise<Package> {
  const arch = os.arch();
  const platform = os.platform();
  const includeCliPrereleases = true;
  const cliVersionRange = ">=4.1.1";
  const libc = platform === "linux" ? "musl" : "";
  const dist = getBaseDist(arch, platform, libc);

  debug(`Finding compatible package for ${dist}...`);
  const versionMap = await getVersionMap(dist);
  const pkg = await getMatchingPkg(
    versionMap,
    cliVersionRange,
    includeCliPrereleases,
  );
  if (!pkg) {
    throw Error(
      `No compatible EdgeDB CLI package found for the current platform ${dist}`,
    );
  }
  debug("  - Package found:", pkg);
  return pkg;
}

async function getVersionMap(dist: string): Promise<Map<string, Package>> {
  debug("Getting version map for distribution:", dist);
  const indexRequest = await fetch(
    new URL(`archive/.jsonindexes/${dist}.json`, EDGEDB_PKG_ROOT),
  );
  const index = (await indexRequest.json()) as { packages: Package[] };
  const versionMap = new Map();

  for (const pkg of index.packages) {
    if (pkg.name !== "edgedb-cli") {
      continue;
    }

    if (
      !versionMap.has(pkg.version) ||
      versionMap.get(pkg.version).revision < pkg.revision
    ) {
      versionMap.set(pkg.version, pkg);
    }
  }

  return versionMap;
}

async function getMatchingPkg(
  versionMap: Map<string, Package>,
  cliVersionRange: string,
  includeCliPrereleases: boolean,
): Promise<Package | null> {
  debug("Getting matching version for range:", cliVersionRange);
  let matchingPkg: Package | null = null;
  for (const [version, pkg] of versionMap.entries()) {
    if (
      semver.satisfies(version, cliVersionRange, {
        includePrerelease: includeCliPrereleases,
      })
    ) {
      if (
        !matchingPkg ||
        semver.compareBuild(version, matchingPkg.version) > 0
      ) {
        matchingPkg = pkg;
      }
    }
  }

  if (matchingPkg) {
    debug("  - Matching version found:", matchingPkg.version);
    return matchingPkg;
  } else {
    throw Error(
      "no published EdgeDB CLI version matches requested version " +
        `'${cliVersionRange}'`,
    );
  }
}

async function downloadFile(url: string | URL, path: string) {
  debug("Downloading file from URL:", url);
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`  - Download failed: ${response.statusText}`);
  }

  const fileStream = createWriteStream(path, { flush: true });

  if (response.body) {
    for await (const chunk of streamReader(response.body)) {
      fileStream.write(chunk);
    }
    fileStream.end();
    debug("  - File downloaded successfully.");
  } else {
    throw new Error("  - Download failed: no response body");
  }
}

function getBaseDist(arch: string, platform: string, libc = ""): string {
  debug("Getting base distribution for:", arch, platform, libc);
  let distArch = "";
  let distPlatform = "";

  if (platform === "linux") {
    if (libc === "") {
      libc = "gnu";
    }
    distPlatform = `unknown-linux-${libc}`;
  } else if (platform === "darwin") {
    distPlatform = "apple-darwin";
  } else {
    throw Error(`This action cannot be run on ${platform}`);
  }

  if (arch === "x64") {
    distArch = "x86_64";
  } else if (arch === "arm64") {
    distArch = "aarch64";
  } else {
    throw Error(`This action does not support the ${arch} architecture`);
  }

  const dist = `${distArch}-${distPlatform}`;
  debug("  - Base distribution:", dist);
  return dist;
}

function getInstallDir(cliPath: string): string {
  debug("Getting install directory for CLI path:", cliPath);
  const installDir = runEdgeDbCli(["info", "--get", "install-dir"], cliPath, {
    stdio: "pipe",
  })
    .toString()
    .trim();
  debug("  - Install directory:", installDir);
  return installDir;
}

async function* streamReader(readableStream: ReadableStream<Uint8Array>) {
  debug("Reading stream...");
  const reader = readableStream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield value;
  }
  debug("  - Stream reading completed.");
}
