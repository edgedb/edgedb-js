import {
  splitName,
  getRef,
  frag,
  joinFrags,
  toIdent,
  quote,
  toTSScalarType,
} from "../util/genutil";
import type {GeneratorParams} from "../generate";

export const generateScalars = async (params: GeneratorParams) => {
  const {dir, types, casts, scalars} = params;
  for (const type of types.values()) {
    if (type.kind !== "scalar") {
      continue;
    }

    const {mod, name: _name} = splitName(type.name);

    const sc = dir.getModule(mod);

    sc.registerRef(type.name, type.id);

    const ref = getRef(type.name);
    const literal = getRef(type.name, {prefix: ""});

    if (type.name === "std::anyenum") {
      sc.writeln(frag`
const ANYENUM_SYMBOL: unique symbol = Symbol("std::anyenum");
export interface ${ref}<
  TsType = unknown,
  Name extends string = string,
  Values extends [string, ...string[]] = [string, ...string[]]
> extends $.ScalarType<Name, TsType> {
  [ANYENUM_SYMBOL]: true;
  __values__: Values;
}`);
      sc.nl();
      continue;
    }

    if (type.is_abstract) {
      const scalarType = scalars.get(type.id);

      if (scalarType.children.length) {
        // is abstract
        const children = scalarType.children.map((desc) => getRef(desc.name));
        sc.writeln(frag`export type ${ref} = ${joinFrags(children, " | ")};`);
        sc.writeln(
          frag`export const ${ref} = $.makeType<${ref}>(_.spec, "${type.id}");`
        );
        sc.nl();

        sc.addExport(ref, `$${_name}`);
      } else if (scalarType.bases.length) {
        // for std::sequence
        const bases = scalarType.bases.map((base) => getRef(base.name));
        sc.writeln(
          frag`export interface ${ref} extends ${joinFrags(bases, ", ")} {}`
        );
        sc.writeln(
          frag`export const ${ref} = $.makeType<${ref}>(_.spec, "${type.id}");`
        );
        sc.nl();

        sc.addExport(ref, `$${_name}`);
      }

      continue;
    }

    // generate enum
    if (type.enum_values && type.enum_values.length) {
      sc.writeln(frag`export enum ${ref}_Enum {`);
      sc.indented(() => {
        for (const val of type.enum_values) {
          sc.writeln(frag`${toIdent(val)} = ${quote(val)},`);
        }
      });
      sc.writeln([`}`]);

      const valuesArr = `[${type.enum_values
        .map((v) => quote(v))
        .join(", ")}]`;
      sc.writeln(
        frag`export type ${ref} = typeof ${ref}_Enum & ${getRef(
          "std::anyenum"
        )}<${ref}_Enum, "${type.name}", ${valuesArr}>;`
      );
      sc.writeln(
        frag`export const ${literal}: ${ref} = {...${ref}_Enum, __values__: ${valuesArr}} as any;`
      );

      sc.nl();
      sc.addExport(literal, _name);
      continue;
    }

    // generate non-enum non-abstract scalar

    const tsType = toTSScalarType(type, types, mod, sc);
    sc.writeln(
      frag`export type ${ref} = $.ScalarType<"${type.name}", ${tsType}>;`
    );
    sc.writeln(
      frag`export const ${ref} = $.makeType<${ref}>(_.spec, "${type.id}");`
    );

    sc.writeln(
      frag`export const ${literal} = (val: ${tsType}) => _.syntax.literal(${ref}, val);`
    );

    if (casts.implicitCastFromMap[type.id]?.length) {
      sc.writeln(
        frag`export type ${ref}λICastableTo = ${joinFrags(
          [
            ref,
            ...casts.implicitCastFromMap[type.id].map((typeId) =>
              getRef(types.get(typeId).name)
            ),
          ],
          " | "
        )};`
      );
    }

    // sc.writeln(`export const ${displayName}: ${displayName} = {`);
    // sc.writeln(`  __name__: "${type.name}",`);
    // sc.writeln(`} as any;`);

    sc.addExport(ref, `$${_name}`);
    sc.addExport(literal, _name);

    sc.nl();
  }
};
