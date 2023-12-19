import process from "node:process";
import fs from "node:fs/promises";
import { type Dirent } from "node:fs";
import path from "node:path";

export type PackageManager = "npm" | "yarn" | "pnpm" | "bun";

export function getPackageManager(): PackageManager {
  const userAgent = process.env.npm_config_user_agent;
  switch (true) {
    case userAgent?.startsWith("yarn"):
      return "yarn";
    case userAgent?.startsWith("pnpm"):
      return "pnpm";
    case userAgent?.startsWith("bun"):
      return "bun";
    default:
      return "npm";
  }
}

export async function copyTemplateFiles(
  source: string,
  dest: string,
  tags: Set<string>
) {
  await _walkDir(source, dest, tags);
}

async function _walkDir(source: string, dest: string, tags: Set<string>) {
  const files: { [filename: string]: { entry: Dirent; tags: string[] }[] } = {};
  const dirs: { [dirname: string]: { entry: Dirent; tags: string[] }[] } = {};
  for (const entry of await fs.readdir(source, { withFileTypes: true })) {
    const parts = entry.name.split(".");
    const name = [
      parts[0],
      ...parts.slice(1).filter((p) => !p.startsWith("__")),
    ].join(".");
    const tags = parts
      .slice(1)
      .filter((p) => p.startsWith("__"))
      .map((tag) => tag.slice(2));

    if ((entry.isDirectory() ? dirs : files)[name]) {
      (entry.isDirectory() ? dirs : files)[name].push({ entry, tags });
    } else {
      (entry.isDirectory() ? dirs : files)[name] = [{ entry, tags }];
    }
  }

  for (const [filename, entries] of Object.entries(files)) {
    const file = entries
      .sort((a, b) => b.tags.length - a.tags.length)
      .find((entry) => entry.tags.every((tag) => tags.has(tag)));

    if (file) {
      await fs.mkdir(dest, { recursive: true });
      await fs.copyFile(
        path.join(source, file.entry.name),
        path.join(dest, filename)
      );
    }
  }

  for (const [dirname, entries] of Object.entries(dirs)) {
    const dir = entries
      .sort((a, b) => b.tags.length - a.tags.length)
      .find((entry) => entry.tags.every((tag) => tags.has(tag)));

    if (dir) {
      await _walkDir(
        path.join(source, dir.entry.name),
        path.join(dest, dirname),
        tags
      );
    }
  }
}
