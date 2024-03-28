#!/usr/bin/env node
import { execSync, type ExecSyncOptions } from "node:child_process";
import * as os from "node:os";
import * as fs from "node:fs";
import * as path from "node:path";
import * as process from "node:process";
import * as semver from "semver";
import envPaths from "env-paths";
import Debug from "debug";
import which from "which";

const debug = Debug("edgedb:cli");

const EDGEDB_PKG_ROOT = "https://packages.edgedb.com";
const EDGEDB_PKG_IDX = `${EDGEDB_PKG_ROOT}/archive/.jsonindexes`;
const CACHE_DIR = envPaths("edgedb").cache;
const TEMPORARY_CLI_PATH = path.join(CACHE_DIR, "/edgedb-cli");
const CLI_CACHE_PATH = path.join(CACHE_DIR, "/cli-location");

interface Package {
  name: string;
  version: string;
  revision: string;
  installref: string;
}

try {
  await main(process.argv.slice(2));
  process.exit(0);
} catch (err) {
  console.error(err);
  process.exit(1);
}

async function main(args: string[]) {
  debug("Starting main function with args:", args);
  const cliLocation =
    whichEdgeDbCli() ??
    (await getCliLocationFromCache()) ??
    (await installEdgeDbCli()) ??
    null;

  return runEdgeDbCli(args, cliLocation);
}

async function installEdgeDbCli(): Promise<string> {
  debug("Installing EdgeDB CLI...");
  await downloadCliPackage();

  const binDir = getBinDir(TEMPORARY_CLI_PATH);
  fs.writeFileSync(CLI_CACHE_PATH, binDir, { encoding: "utf8" });
  debug("CLI installed at:", binDir);

  if (!fs.existsSync(path.join(binDir, "edgedb"))) {
    debug("Self-installing EdgeDB CLI...");
    selfInstallEdgeDbCli(TEMPORARY_CLI_PATH);
  }
  return binDir;
}

async function downloadCliPackage() {
  debug("Downloading CLI package...");
  const cliPkg = await findPackage();
  const downloadDir = path.dirname(TEMPORARY_CLI_PATH);
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }
  const downloadUrl = new URL(cliPkg.installref, EDGEDB_PKG_ROOT);
  await downloadFile(downloadUrl, TEMPORARY_CLI_PATH);
  debug("CLI package downloaded to:", TEMPORARY_CLI_PATH);

  fs.chmodSync(TEMPORARY_CLI_PATH, 0o755);
}

async function getCliLocationFromCache(): Promise<string | null> {
  debug("Checking CLI cache...");
  if (fs.existsSync(CLI_CACHE_PATH)) {
    const cachedBinDir = fs
      .readFileSync(CLI_CACHE_PATH, { encoding: "utf8" })
      .trim();
    if (cachedBinDir && fs.existsSync(path.join(cachedBinDir, "edgedb"))) {
      debug("CLI found in cache at:", cachedBinDir);
      return cachedBinDir;
    }
  }
  debug("No CLI found in cache.");
  return null;
}

function whichEdgeDbCli() {
  debug("Checking if CLI is in PATH...");
  const location = which.sync("edgedb", { nothrow: true });
  debug("CLI location:", location);
  if (location) {
    return path.dirname(location);
  }
  return null;
}

function runEdgeDbCli(
  args: string[],
  pathToCli: string | null,
  execOptions: ExecSyncOptions = { stdio: "inherit" }
) {
  const cliCommand = path.join(pathToCli ?? "", "edgedb");
  debug("Running EdgeDB CLI command:", cliCommand, "with args:", args);
  return execSync(`${cliCommand} ${args.join(" ")}`, execOptions);
}

function selfInstallEdgeDbCli(pathToCli: string) {
  debug("Self-installing EdgeDB CLI...");
  return runEdgeDbCli(["_self_install"], pathToCli);
}

async function findPackage(): Promise<Package> {
  debug("Finding compatible package...");
  const arch = os.arch();
  const platform = os.platform();
  const includeCliPrereleases = true;
  const cliVersionRange = "*";
  const libc = platform === "linux" ? "musl" : "";
  const dist = getBaseDist(arch, platform, libc);

  const versionMap = await getVersionMap(dist);
  const pkg = await getMatchingPkg(
    versionMap,
    cliVersionRange,
    includeCliPrereleases
  );
  if (!pkg) {
    throw Error(
      "No compatible EdgeDB CLI package found for the current platform"
    );
  }
  debug("Package found:", pkg);
  return pkg;
}

async function getVersionMap(dist: string): Promise<Map<string, Package>> {
  debug("Getting version map for distribution:", dist);
  const indexRequest = await fetch(`${EDGEDB_PKG_IDX}/${dist}.json`);
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
  includeCliPrereleases: boolean
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
    debug("Matching version found:", matchingPkg.version);
    return matchingPkg;
  } else {
    throw Error(
      "no published EdgeDB CLI version matches requested version " +
        `'${cliVersionRange}'`
    );
  }
}

async function downloadFile(url: string | URL, path: string) {
  debug("Downloading file from URL:", url);
  const response = await fetch(url);
  const fileStream = fs.createWriteStream(path);
  if (response.body) {
    for await (const chunk of streamReader(response.body)) {
      fileStream.write(chunk);
    }
    fileStream.end();
    debug("File downloaded successfully.");
  } else {
    throw new Error("Download failed: no response body");
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
  debug("Base distribution:", dist);
  return dist;
}

function getBinDir(cliPath: string): string {
  debug("Getting binary directory for CLI path:", cliPath);
  const binDir = runEdgeDbCli(["info", "--get", "'bin-dir'"], cliPath);
  debug("Binary directory:", binDir);
  return binDir.toString().trim();
}

async function* streamReader(readableStream: ReadableStream<Uint8Array>) {
  debug("Reading stream...");
  const reader = readableStream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield value;
  }
  debug("Stream reading completed.");
}
