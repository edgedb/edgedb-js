import * as path from "path";
import * as fs from "fs";
import {StrictMap} from "./strictMap";
import * as genutil from "./util/genutil";

export interface IdentRef {
  type: "identRef";
  name: string;
  opts?: {prefix?: string};
}

export type CodeFragment = string | IdentRef;

export class CodeBuffer {
  private buf: CodeFragment[][] = [];
  private indent: number = 0;

  getBuf() {
    return this.buf;
  }

  nl(): void {
    this.buf.push([""]);
  }

  indented(nested: () => void): void {
    this.indent++;
    try {
      nested();
    } finally {
      this.indent--;
    }
  }

  writeln(...lines: CodeFragment[][]): void {
    lines.forEach((line) => {
      this.buf.push(["  ".repeat(this.indent), ...line]);
    });
  }

  writeBuf(buf: CodeBuffer) {
    this.writeln(...buf.getBuf());
  }

  isEmpty(): boolean {
    return !this.buf.length;
  }
}

export class CodeBuilder {
  private buf = new CodeBuffer();
  private namespaces: {[k: string]: string[]} = {};
  private indent: number = 0;
  private imports = new Set<string>();
  private exports = new Map<string, IdentRef>();

  constructor(private dirBuilder: DirBuilder, private dir: string) {}

  addImport(imp: string): void {
    this.imports.add(imp);
  }

  addExport(ref: IdentRef, as: string) {
    this.exports.set(as, ref);
  }

  registerRef(fqn: string, id: string) {
    if (this.dirBuilder._refs.has(fqn)) {
      throw new Error(`ref name: ${fqn} already registered`);
    }

    this.dirBuilder._refs.set(fqn, {
      dir: this.dir,
      internalName: genutil.getInternalName({id, fqn}),
    });
  }

  nl(): void {
    this.buf.nl();
  }

  indented(nested: () => void): void {
    this.buf.indented(nested);
  }

  writeln(...lines: CodeFragment[][]): void {
    this.buf.writeln(...lines);
  }

  writeBuf(buf: CodeBuffer) {
    this.buf.writeBuf(buf);
  }

  render(): string {
    const imports = new Set(this.imports);

    let body = this.buf
      .getBuf()
      .map((line) => {
        return line
          .map((frag) => {
            if (typeof frag === "string") {
              return frag;
            } else {
              const ref = this.dirBuilder._refs.get(frag.name);

              if (!ref) {
                throw new Error(`Cannot find ref: ${frag.name}`);
              }

              let prefix = "";
              if (ref.dir !== this.dir) {
                const mod = path.basename(ref.dir, path.extname(ref.dir));
                prefix = `_${mod}`;

                let importPath = path.join(
                  path.relative(path.dirname(this.dir), path.dirname(ref.dir)),
                  mod
                );

                if (!importPath.startsWith("../")) {
                  importPath = "./" + importPath;
                }

                imports.add(`import * as ${prefix} from "${importPath}"`);
              }

              return (
                (prefix ? prefix + "." : "") +
                (frag.opts?.prefix ?? "") +
                ref.internalName
              );
            }
          })
          .join("");
      })
      .join("\n");

    if (this.exports.size) {
      body += `\n\nexport default {\n${[...this.exports.entries()]
        .map(([name, refFrag]) => {
          const ref = this.dirBuilder._refs.get(refFrag.name);

          if (!ref) {
            throw new Error(`Cannot find ref: ${refFrag.name}`);
          }

          return `  ${genutil.quote(name)}: ${
            (refFrag.opts?.prefix ?? "") + ref.internalName
          }`;
        })
        .join(",\n")}\n}`;
    }

    let head = Array.from(imports).join("\n");

    if (head && body) {
      head += "\n\n";
    }

    let result = head + body;
    if (result && result.slice(-1) !== "\n") {
      result += "\n";
    }

    return result;
  }

  isEmpty(): boolean {
    return this.buf.isEmpty() && !this.imports.size;
  }
}

let moduleCounter = 0;

export class DirBuilder {
  private _map = new StrictMap<string, CodeBuilder>();
  _refs = new Map<string, {internalName: string; dir: string}>();
  _modules = new Map<string, string>();

  getPath(fn: string): CodeBuilder {
    if (!this._map.has(fn)) {
      this._map.set(fn, new CodeBuilder(this, fn));
    }
    return this._map.get(fn);
  }

  getModule(moduleName: string): CodeBuilder {
    if (!this._modules.has(moduleName)) {
      const internalName = genutil.makeValidIdent({
        name: moduleName,
        id: `${moduleCounter++}`,
        skipKeywordCheck: true,
      });

      this._modules.set(moduleName, internalName);
    }

    const mod = this.getPath(`modules/${this._modules.get(moduleName)}.ts`);

    mod.addImport(`import {reflection as $} from "edgedb";`);
    mod.addImport(`import * as _ from "../imports";`);

    return mod;
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
