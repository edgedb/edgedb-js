// import * as path from "path";
// import * as fs from "fs";
import {fs, path, exists} from "../adapter.node";
import {StrictMap} from "./strictMap";
import * as genutil from "./util/genutil";
import {importExportHelpers} from "./importExportHelpers";

type Mode = "ts" | "js" | "dts";
type ModuleKind = "esm" | "cjs";

export interface IdentRef {
  type: "identRef";
  name: string;
  opts?: {prefix?: string};
}

export type CodeFragment = string | IdentRef;

export interface Frag {
  type: "frag";
  modes: Set<Mode>;
  content: CodeFragment[];
}

export const f =
  (...modes: Mode[]) =>
  (
    strings: TemplateStringsArray,
    ...exprs: (CodeFragment | CodeFragment[])[]
  ): Frag => {
    return {
      type: "frag",
      modes: new Set(modes),
      content: genutil.frag(strings, ...exprs),
    };
  };

export const ts = f("ts");
export const js = f("js");
export const r = f("ts", "js");
export const all = f("ts", "js", "dts");
export const dts = f("dts");
export const t = f("ts", "dts");

type AnyCodeFrag = CodeFragment | Frag;

export class CodeBuffer {
  private buf: AnyCodeFrag[][] = [];
  private indent: number = 0;

  getBuf() {
    return this.buf;
  }

  nl(): void {
    this.buf.push(["\n"]);
  }

  indented(nested: () => void): void {
    this.indent++;
    try {
      nested();
    } finally {
      this.indent--;
    }
  }

  writeln(...lines: AnyCodeFrag[][]): void {
    lines.forEach(line => {
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

type Import = {
  fromPath: string;
  modes?: Set<Mode>;
  allowFileExt?: boolean;
  typeOnly: boolean;
} & (
  | {type: "default"; name: string}
  | {type: "star"; name: string}
  | {type: "partial"; names: {[key: string]: string | boolean}}
);

type Export = {modes?: Set<Mode>} & (
  | {
      type: "named";
      name: string | IdentRef | (string | IdentRef)[];
      as?: string;
      isDefault: boolean;
    }
  | {type: "refsDefault"; ref: IdentRef; as: string}
  | {
      type: "from";
      names: {[key: string]: string | boolean};
      fromPath: string;
      allowFileExt?: boolean;
    }
  | {
      type: "starFrom";
      name: string | null;
      fromPath: string;
      allowFileExt?: boolean;
    }
);

class BuilderImportsExports {
  constructor(
    public imports: Set<Import> = new Set<Import>(),
    public exports: Set<Export> = new Set<Export>()
  ) {}

  addImport(
    names: {[key: string]: string | boolean},
    fromPath: string,
    allowFileExt: boolean = false,
    modes?: Mode[],
    typeOnly: boolean = false
  ) {
    this.imports.add({
      type: "partial",
      fromPath,
      names,
      allowFileExt,
      modes: modes && new Set(modes),
      typeOnly,
    });
  }

  addDefaultImport(
    name: string,
    fromPath: string,
    allowFileExt: boolean = false,
    modes?: Mode[],
    typeOnly: boolean = false
  ) {
    this.imports.add({
      type: "default",
      fromPath,
      name,
      allowFileExt,
      modes: modes && new Set(modes),
      typeOnly,
    });
  }

  addStarImport(
    name: string,
    fromPath: string,
    allowFileExt: boolean = false,
    modes?: Mode[],
    typeOnly: boolean = false
  ) {
    this.imports.add({
      type: "star",
      fromPath,
      name,
      allowFileExt,
      modes: modes && new Set(modes),
      typeOnly,
    });
  }

  addExport(
    name: string | IdentRef | (string | IdentRef)[],
    as?: string,
    isDefault: boolean = false,
    modes?: Mode[]
  ) {
    this.exports.add({
      type: "named",
      name,
      as,
      isDefault,
      modes: modes && new Set(modes),
    });
  }

  addRefsDefaultExport(ref: IdentRef, as: string) {
    this.exports.add({
      type: "refsDefault",
      ref,
      as,
    });
  }

  addExportFrom(
    names: {[key: string]: string | boolean},
    fromPath: string,
    allowFileExt: boolean = false,
    modes?: Mode[]
  ) {
    this.exports.add({
      type: "from",
      names,
      fromPath,
      allowFileExt,
      modes: modes && new Set(modes),
    });
  }

  addExportStarFrom(
    name: string | null,
    fromPath: string,
    allowFileExt: boolean = false,
    modes?: Mode[]
  ) {
    this.exports.add({
      type: "starFrom",
      name,
      fromPath,
      allowFileExt,
      modes: modes && new Set(modes),
    });
  }

  renderImports({
    mode,
    moduleKind,
    helpers,
  }: {
    mode: Mode;
    moduleKind: ModuleKind;
    helpers: Set<keyof typeof importExportHelpers>;
  }) {
    const imports = new Set<string>();
    for (const imp of this.imports) {
      if (
        (imp.modes && !imp.modes.has(mode)) ||
        (imp.typeOnly && mode === "js")
      ) {
        continue;
      }

      const esmFileExt =
        imp.allowFileExt && mode === "js"
          ? imp.fromPath.startsWith(".")
            ? ".mjs"
            : ".js"
          : "";

      switch (imp.type) {
        case "default":
          if (moduleKind === "cjs") helpers.add("importDefault");
          imports.add(
            moduleKind === "esm"
              ? `import${imp.typeOnly ? " type" : ""} ${imp.name} from "${
                  imp.fromPath
                }${esmFileExt}";`
              : `const ${imp.name} = __importDefault(require("${imp.fromPath}")).default;`
          );
          break;
        case "star":
          if (moduleKind === "cjs") {
            helpers
              .add("createBinding")
              .add("setModuleDefault")
              .add("importStar");
          }
          imports.add(
            moduleKind === "esm"
              ? `import${imp.typeOnly ? " type" : ""} * as ${imp.name} from "${
                  imp.fromPath
                }${esmFileExt}";`
              : `const ${imp.name} = __importStar(require("${imp.fromPath}"));`
          );
          break;
        case "partial":
          const names = Object.entries(imp.names)
            .map(([key, val]) => {
              if (typeof val === "boolean" && !val) return null;
              return (
                key +
                (typeof val === "string"
                  ? `${moduleKind === "esm" ? " as" : ":"} ${val}`
                  : "")
              );
            })
            .filter(val => val !== null)
            .join(", ");
          imports.add(
            moduleKind === "esm"
              ? `import${imp.typeOnly ? " type" : ""} { ${names} } from "${
                  imp.fromPath
                }${esmFileExt}";`
              : `const { ${names} } = require("${imp.fromPath}");`
          );
          break;
      }
    }

    return [...imports].join("\n");
  }

  renderExports({
    mode,
    moduleKind,
    refs,
    helpers,
    forceDefaultExport = false,
  }: {
    mode: Mode;
    moduleKind: ModuleKind;
    refs: Map<string, {internalName: string; dir: string}>;
    helpers: Set<keyof typeof importExportHelpers>;
    forceDefaultExport?: boolean;
  }) {
    const exports: string[] = [];
    const exportsFrom: string[] = [];
    const exportList: string[] = [];
    const refsDefault: {ref: string; as: string}[] = [];
    let hasDefaultExport = false;
    for (const exp of this.exports) {
      if (exp.modes && !exp.modes.has(mode)) {
        continue;
      }
      switch (exp.type) {
        case "named":
          let name = "";
          const nameFrags = Array.isArray(exp.name) ? exp.name : [exp.name];
          for (const nameFrag of nameFrags) {
            if (typeof nameFrag === "string") {
              name += nameFrag;
            } else {
              const nameRef = refs.get(nameFrag.name);

              if (!nameRef) {
                throw new Error(`Cannot find ref: ${nameFrag.name}`);
              }

              name += (nameFrag.opts?.prefix ?? "") + nameRef.internalName;
            }
          }

          if (exp.isDefault) {
            if (hasDefaultExport || refsDefault.length) {
              throw new Error("multiple default exports");
            }
            if (moduleKind === "esm") {
              exports.push(`export default ${name};`);
            } else {
              exports.push(`exports.default = ${name}`);
            }
            hasDefaultExport = true;
          } else {
            if (moduleKind === "esm") {
              exportList.push(
                `${name}${exp.as != null ? ` as ${exp.as}` : ""}`
              );
            } else {
              exportList.push(`${exp.as != null ? exp.as : name}: ${name}`);
            }
          }
          break;
        case "from":
          if (moduleKind === "esm") {
            exportsFrom.push(
              `export { ${Object.entries(exp.names)
                .map(([key, val]) => {
                  if (typeof val === "boolean" && !val) return null;
                  return key + (typeof val === "string" ? `as ${val}` : "");
                })
                .filter(val => val !== null)
                .join(", ")} } from "${exp.fromPath}${
                exp.allowFileExt && mode === "js"
                  ? exp.fromPath.startsWith(".")
                    ? ".mjs"
                    : ".js"
                  : ""
              }";`
            );
          } else {
            const modName = exp.fromPath.replace(/[^a-z]/gi, "") + "_1";
            exportsFrom.push(
              `(function () {\n  var ${modName} = require("${exp.fromPath}");`
            );
            for (const [expName, val] of Object.entries(exp.names)) {
              if (typeof val === "boolean" && !val) {
                continue;
              }
              exportsFrom.push(
                `  Object.defineProperty(exports, "${
                  typeof val === "string" ? val : expName
                }", { enumerable: true, get: function () { return ${modName}.${expName}; } });`
              );
            }
            exportsFrom.push(`})();`);
          }
          break;
        case "starFrom":
          if (moduleKind === "esm") {
            exportsFrom.push(
              `export * ${exp.name !== null ? `as ${exp.name} ` : ""}from "${
                exp.fromPath
              }${
                exp.allowFileExt && mode === "js"
                  ? exp.fromPath.startsWith(".")
                    ? ".mjs"
                    : ".js"
                  : ""
              }";`
            );
          } else {
            if (exp.name !== null) {
              helpers
                .add("createBinding")
                .add("setModuleDefault")
                .add("importStar");
              exportsFrom.push(
                `exports.${exp.name} = __importStar(require("${exp.fromPath}"));`
              );
            } else {
              helpers.add("createBinding").add("exportStar");
              exportsFrom.push(
                `__exportStar(require("${exp.fromPath}"), exports);`
              );
            }
          }
          break;
        case "refsDefault":
          if (hasDefaultExport) {
            throw new Error("multiple default exports");
          }

          const ref = refs.get(exp.ref.name);

          if (!ref) {
            throw new Error(`Cannot find ref: ${exp.ref.name}`);
          }

          refsDefault.push({
            ref: (exp.ref.opts?.prefix ?? "") + ref.internalName,
            as: exp.as,
          });
      }
    }

    if (exportList.length) {
      if (moduleKind === "esm") {
        exports.push(`export { ${exportList.join(", ")} };\n`);
      } else {
        exports.push(
          `Object.assign(exports, { ${exportList.join(", ")} });\n`
        );
      }
    }
    if (refsDefault.length || forceDefaultExport) {
      if (mode === "ts" || mode === "dts") {
        exports.push(
          `${
            mode === "dts" ? "declare " : ""
          }type __defaultExports = {\n${refsDefault
            .map(({ref, as}) => `  ${genutil.quote(as)}: typeof ${ref}`)
            .join(";\n")}\n};`
        );
      }
      if (mode === "ts" || mode === "js") {
        exports.push(
          `const __defaultExports${
            mode === "ts" ? ": __defaultExports" : ""
          } = {\n${refsDefault
            .map(({ref, as}) => `  ${genutil.quote(as)}: ${ref}`)
            .join(",\n")}\n};`
        );
      }
      if (mode === "dts") {
        exports.push(`declare const __defaultExports: __defaultExports;`);
      }
      if (moduleKind === "esm") {
        exports.push(`export default __defaultExports;`);
      } else {
        exports.push(`exports.default = __defaultExports;`);
      }
    }
    return {exports: exports.join("\n"), exportsFrom: exportsFrom.join("\n")};
  }

  clone() {
    return new BuilderImportsExports(
      new Set(this.imports),
      new Set(this.exports)
    );
  }
}

export class CodeBuilder {
  private buf = new CodeBuffer();
  private importsExports = new BuilderImportsExports();

  constructor(private dirBuilder: DirBuilder, private dir: string) {}

  addImport = this.importsExports.addImport.bind(this.importsExports);
  addDefaultImport = this.importsExports.addDefaultImport.bind(
    this.importsExports
  );
  addStarImport = this.importsExports.addStarImport.bind(this.importsExports);

  addExport = this.importsExports.addExport.bind(this.importsExports);
  addRefsDefaultExport = this.importsExports.addRefsDefaultExport.bind(
    this.importsExports
  );
  addExportFrom = this.importsExports.addExportFrom.bind(this.importsExports);
  addExportStarFrom = this.importsExports.addExportStarFrom.bind(
    this.importsExports
  );

  getDefaultExportKeys(): string[] {
    return [...this.importsExports.exports]
      .filter(exp => exp.type === "refsDefault")
      .map(exp => (exp as any).as);
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

  writeln(...lines: AnyCodeFrag[][]): void {
    this.buf.writeln(...lines);
  }

  writeBuf(buf: CodeBuffer) {
    this.buf.writeBuf(buf);
  }

  private resolveIdentRef(
    identRef: IdentRef,
    importsExports: BuilderImportsExports
  ): string {
    const ref = this.dirBuilder._refs.get(identRef.name);

    if (!ref) {
      throw new Error(`Cannot find ref: ${identRef.name}`);
    }

    let prefix = "";
    if (ref.dir !== this.dir) {
      const mod = path.posix.basename(ref.dir, path.posix.extname(ref.dir));
      prefix = `_${mod}`;

      let importPath = path.posix.join(
        path.posix.relative(
          path.posix.dirname(this.dir),
          path.posix.dirname(ref.dir)
        ),
        mod
      );

      if (!importPath.startsWith("../")) {
        importPath = "./" + importPath;
      }

      importsExports.addStarImport(prefix, importPath, true, undefined, true);
    }

    return (
      (prefix ? prefix + "." : "") +
      (identRef.opts?.prefix ?? "") +
      ref.internalName
    );
  }

  render({
    mode,
    moduleKind,
    forceDefaultExport,
  }: {
    mode: Mode;
    moduleKind?: ModuleKind;
    forceDefaultExport?: boolean;
  }): string {
    moduleKind ??= mode === "js" ? "cjs" : "esm";

    const importsExports = this.importsExports.clone();

    let body = "";
    for (const lineFrags of this.buf.getBuf()) {
      const line = lineFrags
        .map(frag => {
          if (typeof frag === "string") {
            return frag;
          } else if (frag.type === "identRef") {
            return this.resolveIdentRef(frag, importsExports);
          } else if (frag.modes.has(mode)) {
            return frag.content
              .map(contentFrag =>
                typeof contentFrag === "string"
                  ? contentFrag
                  : this.resolveIdentRef(contentFrag, importsExports)
              )
              .join("");
          } else {
            return "";
          }
        })
        .join("");
      if (line.trim().length || line.endsWith("\n")) {
        body += line + (!line.endsWith("\n") ? "\n" : "");
      }
    }

    const helpers = new Set<keyof typeof importExportHelpers>();

    const {exports, exportsFrom} = importsExports.renderExports({
      mode,
      moduleKind,
      refs: this.dirBuilder._refs,
      helpers,
      forceDefaultExport,
    });

    body += "\n\n" + exports;

    let head =
      mode === "js" && moduleKind === "cjs"
        ? `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });\n`
        : "";

    const imports = importsExports.renderImports({mode, moduleKind, helpers});

    if (helpers.size) {
      head += [...helpers.values()]
        .map(helperName => importExportHelpers[helperName])
        .join("\n");
    }
    head += exportsFrom + "\n";
    head += imports;

    if (head && body) {
      head += "\n";
    }

    return (head + body).trim() + "\n";
  }

  isEmpty(): boolean {
    return (
      this.buf.isEmpty() &&
      !this.importsExports.imports.size &&
      !this.importsExports.exports.size
    );
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

    const mod = this.getPath(`modules/${this._modules.get(moduleName)}`);

    mod.addImport({$: true}, "edgedb");
    mod.addStarImport("_", "../imports", true);

    return mod;
  }

  debug(): string {
    const buf = [];
    for (const [fn, _builder] of this._map.entries()) {
      buf.push(`>>> ${fn}\n`);
      // buf.push(builder.render());
      buf.push(`\n`);
    }
    return buf.join("\n");
  }

  async write(
    to: string,
    mode: "ts" | "js+dts",
    moduleKind: ModuleKind
  ): Promise<void> {
    const dir = path.normalize(to);
    for (const [fn, builder] of this._map.entries()) {
      if (builder.isEmpty()) {
        continue;
      }

      const dest = path.join(dir, fn);
      const destDir = path.dirname(dest);

      if (!(await exists(destDir))) {
        await fs.mkdir(destDir, {recursive: true});
      }

      const forceDefaultExport = fn.startsWith("modules/");

      if (mode === "ts") {
        await fs.writeFile(
          dest + ".ts",
          builder.render({mode: "ts", forceDefaultExport})
        );
      } else if (mode === "js+dts") {
        await fs.writeFile(
          dest + (moduleKind === "esm" ? ".mjs" : ".js"),
          builder.render({mode: "js", moduleKind, forceDefaultExport})
        );
        await fs.writeFile(
          dest + ".d.ts",
          builder.render({mode: "dts", forceDefaultExport})
        );
      }
    }
  }
}
