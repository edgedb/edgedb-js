import * as path from "path";
import * as fs from "fs";
import {StrictMap} from "./strictMap";

export class CodeBuilder {
  private buf: string[] = [];
  private namespaces: {[k: string]: string[]} = {};
  private indent: number = 0;
  private imports = new Set<string>();

  getBuf() {
    return this.buf;
  }
  addImport(imp: string): void {
    this.imports.add(imp);
  }

  nl(): void {
    this.buf.push("");
    this.namespaces;
  }

  namespace(ns: string, nested: (cb: CodeBuilder) => void): void {
    const newCB = new CodeBuilder();
    newCB.indented(() => nested(newCB));
    this.namespaces[ns] = [...this.namespaces[ns], ...newCB.getBuf()];
  }

  indented(nested: () => void): void {
    this.indent++;
    try {
      nested();
    } finally {
      this.indent--;
    }
  }

  writeln(...lines: string[]): void {
    lines.forEach((line) => {
      this.buf.push("  ".repeat(this.indent) + line);
    });
  }

  render(): string {
    let head = Array.from(this.imports).join("\n");
    const body = this.buf.join("\n");
    const namespaces = Object.keys(this.namespaces)
      .map((ns) =>
        [`namespace ${ns} {`, ...this.namespaces[ns], `}`].join("\n")
      )
      .join("\n\n");

    if (head && namespaces.length) {
      head += "\n\n";
      head += namespaces;
    }
    if (head && body) {
      head += "\n\n";
    }

    let result = head + body;
    if (result && result.slice(-1) != "\n") {
      result += "\n";
    }

    return result;
  }

  isEmpty(): boolean {
    return !this.buf.length && !this.imports.size;
  }
}

export class DirBuilder {
  private _map = new StrictMap<string, CodeBuilder>();

  getPath(fn: string): CodeBuilder {
    if (!this._map.has(fn)) {
      this._map.set(fn, new CodeBuilder());
    }
    return this._map.get(fn);
  }

  debug(): string {
    const buf = [];
    for (const [fn, builder] of this._map.entries()) {
      buf.push(`>>> ${fn}\n`);
      buf.push(builder.render());
      buf.push(`\n`);
    }
    return buf.join("\n");
  }

  write(to: string): void {
    const dir = path.normalize(to);
    for (const [fn, builder] of this._map.entries()) {
      if (builder.isEmpty()) {
        continue;
      }

      const dest = path.join(dir, fn);
      const destDir = path.dirname(dest);

      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, {recursive: true});
      }

      fs.writeFileSync(dest, builder.render());
    }
  }
}
