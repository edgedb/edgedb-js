import process from "node:process";

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
