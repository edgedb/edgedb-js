import {path, homeDir, fs} from "./adapter.node";

export const isWindows = process.platform === "win32";

let _configDir: () => string;

if (process.platform === "darwin") {
  _configDir = () => {
    return path.join(homeDir(), "Library", "Application Support", "edgedb");
  };
} else if (process.platform === "win32") {
  _configDir = () => {
    const localAppDataDir =
      process.env.LOCALAPPDATA ?? path.join(homeDir(), "AppData", "Local");

    return path.join(localAppDataDir, "EdgeDB", "config");
  };
} else {
  _configDir = () => {
    let xdgConfigDir = process.env.XDG_CONFIG_HOME;
    if (!xdgConfigDir || !path.isAbsolute(xdgConfigDir)) {
      xdgConfigDir = path.join(homeDir(), ".config");
    }

    return path.join(xdgConfigDir, "edgedb");
  };
}

export function searchConfigDir(...configPath: string[]): string {
  const filePath = path.join(_configDir(), ...configPath);

  if (fs.existsSync(filePath)) {
    return filePath;
  }

  const fallbackPath = path.join(homeDir(), ".edgedb", ...configPath);
  if (fs.existsSync(fallbackPath)) {
    return fallbackPath;
  }

  // None of the searched files exists, return the new path.
  return filePath;
}
