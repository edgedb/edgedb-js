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

export function getConfigDir(): string {
  let configDir = _configDir();
  if (!fs.existsSync(configDir)) {
    configDir = path.join(homeDir(), ".edgedb");
  }
  return configDir;
}
