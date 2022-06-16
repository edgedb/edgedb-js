import type {GeneratorParams} from "../generate";
import {frag, getRef, quote, splitName} from "../util/genutil";
import {
  CodeBuffer,
  CodeBuilder,
  CodeFragment,
  DirBuilder,
  dts,
  r,
  t,
  ts,
} from "../builders";

import {Param, Typemod} from "../queries/getFunctions";
import {getStringRepresentation} from "./generateObjectTypes";
import {introspect, StrictMap} from "../../reflection";
import {
  getTypesSpecificity,
  sortFuncopOverloads,
  getImplicitCastableRootTypes,
  expandFuncopAnytypeOverloads,
  GroupedParams,
  findPathOfAnytype,
  AnytypeDef,
  FuncopDefOverload,
} from "../util/functionUtils";
import {Casts} from "../queries/getCasts";

export const generateGlobals = ({
  dir,
  globals,
  types,
  casts,
}: GeneratorParams) => {
  for (const [id, g] of globals.entries()) {
    const {mod, name} = splitName(g.name);
    const code = dir.getModule(mod);
    code.registerRef(g.name, id);
    code.addRefsDefaultExport(getRef(g.name, {prefix: ""}), name);

  }
};
