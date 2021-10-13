import {
  splitName,
  getRef,
  frag,
  joinFrags,
  toIdent,
  quote,
  toTSScalarType,
} from "../util/genutil";
import {dts, js, r, t, ts} from "../builders";
import type {GeneratorParams} from "../generate";

export const generateScalars = (params: GeneratorParams) => {
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
      //       sc.writeln(frag`
      // const ANYENUM_SYMBOL: unique symbol = Symbol("std::anyenum");
      // export interface ${ref}<
      //   TsType = unknown,
      //   Name extends string = string,
      //   Values extends [string, ...string[]] = [string, ...string[]]
      // > extends $.ScalarType<Name, TsType> {
      //   [ANYENUM_SYMBOL]: true;
      //   __values__: Values;
      // }`);
      //       sc.nl();
      continue;
    }

    if (type.is_abstract) {
      const scalarType = scalars.get(type.id);

      if (scalarType.children.length) {
        // is abstract
        const children = scalarType.children.map(desc =>
          desc.name === "std::anyenum" ? "$.EnumType" : getRef(desc.name)
        );
        sc.writeln([
          dts`declare `,
          t`type ${ref} = ${joinFrags(children, " | ")};`,
        ]);
        sc.writeln([
          dts`declare `,
          ...frag`const ${ref}`,
          t`: ${ref}`,
          r` = $.makeType`,
          ts`<${ref}>`,
          r`(_.spec, "${type.id}", _.syntax.literal);`,
        ]);
        sc.nl();

        sc.addExport(ref);
        sc.addRefsDefaultExport(ref, `$${_name}`);
      } else if (scalarType.bases.length) {
        // for std::sequence
        const bases = scalarType.bases.map(base => getRef(base.name));
        sc.writeln([t`interface ${ref} extends ${joinFrags(bases, ", ")} {}`]);
        sc.writeln([
          dts`declare `,
          ...frag`const ${ref}`,
          t`: ${ref}`,
          r` = $.makeType`,
          ts`<${ref}>`,
          r`(_.spec, "${type.id}", _.syntax.literal);`,
        ]);
        sc.nl();

        sc.addExport(ref);
        sc.addRefsDefaultExport(ref, `$${_name}`);
      }

      continue;
    }

    // generate enum
    if (type.enum_values && type.enum_values.length) {
      sc.writeln([
        dts`declare `,
        t`enum `,
        js`const `,
        ...frag`${ref}λEnum `,
        js`= `,
        `{`,
      ]);
      sc.indented(() => {
        for (const val of type.enum_values) {
          sc.writeln([toIdent(val), t` = `, js`: `, quote(val), `,`]);
        }
      });
      sc.writeln([`}`]);
      sc.addExport(frag`${ref}λEnum`);

      sc.writeln([
        t`export `,
        dts`declare `,
        t`type ${ref} = typeof ${ref}λEnum & $.EnumType<${quote(
          type.name
        )}, ${ref}λEnum, \`\${${ref}λEnum}\`>;`,
      ]);
      sc.writeln([
        dts`declare `,
        ...frag`const ${literal}`,
        t`: ${ref}`,
        r` = $.makeType`,
        ts`<${ref}>`,
        r`(_.spec, "${type.id}", _.syntax.literal);`,
      ]);

      sc.nl();
      sc.addExport(literal);
      sc.addRefsDefaultExport(literal, _name);
      continue;
    }

    // generate non-enum non-abstract scalar

    const tsType = toTSScalarType(type, types, mod, sc);
    sc.writeln([
      t`export `,
      dts`declare `,
      t`type ${ref} = $.ScalarType<"${type.name}", ${tsType}>;`,
    ]);
    sc.writeln([
      dts`declare `,
      ...frag`const ${literal}`,
      t`: ${ref}`,
      r` = $.makeType`,
      ts`<${ref}>`,
      r`(_.spec, "${type.id}", _.syntax.literal);`,
    ]);

    if (casts.implicitCastFromMap[type.id]?.length) {
      sc.writeln([
        t`export `,
        dts`declare `,
        t`type ${ref}λICastableTo = ${joinFrags(
          [
            ref,
            ...casts.implicitCastFromMap[type.id].map(typeId =>
              getRef(types.get(typeId).name)
            ),
          ],
          " | "
        )};`,
      ]);
    }

    const assignableMap = casts.assignableByMap[type.id] || [];
    if (casts.assignableByMap[type.id]?.length) {
      sc.writeln([
        t`export `,
        dts`declare `,
        t`type ${ref}λIAssignableBy = ${joinFrags(
          assignableMap.length
            ? assignableMap.map(typeId => getRef(types.get(typeId).name))
            : [ref],
          " | "
        )};`,
      ]);
    }

    sc.addExport(literal);
    sc.addRefsDefaultExport(literal, _name);

    sc.nl();
  }
};
