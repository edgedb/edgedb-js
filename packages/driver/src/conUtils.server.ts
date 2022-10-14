import {path, fs, readFileUtf8, exists, hashSHA1toHex} from "./adapter.node";
import * as platform from "./platform";
import {getConnectArgumentsParser} from "./conUtils";

const projectDirCache = new Map<string, string | null>();

async function findProjectDir(): Promise<string | null> {
  const workingDir = process.cwd();

  if (projectDirCache.has(workingDir)) {
    return projectDirCache.get(workingDir)!;
  }

  let dir = workingDir;
  const cwdDev = (await fs.stat(dir)).dev;
  while (true) {
    if (await exists(path.join(dir, "edgedb.toml"))) {
      projectDirCache.set(workingDir, dir);
      return dir;
    }
    const parentDir = path.join(dir, "..");
    if (parentDir === dir || (await fs.stat(parentDir)).dev !== cwdDev) {
      projectDirCache.set(workingDir, null);
      return null;
    }
    dir = parentDir;
  }
}

export async function findStashPath(projectDir: string): Promise<string> {
  let projectPath = await fs.realpath(projectDir);
  if (platform.isWindows && !projectPath.startsWith("\\\\")) {
    projectPath = "\\\\?\\" + projectPath;
  }

  const hash = hashSHA1toHex(projectPath);
  const baseName = path.basename(projectPath);
  const dirName = baseName + "-" + hash;

  return platform.searchConfigDir("projects", dirName);
}

export const serverUtils = {
  findProjectDir,
  findStashPath,
  readFileUtf8,
  searchConfigDir: platform.searchConfigDir
};

export const parseConnectArguments = getConnectArgumentsParser(serverUtils);
