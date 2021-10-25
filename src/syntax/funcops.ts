import {
  Expression,
  BaseType,
  BaseTypeSet,
  Cardinality,
  ExpressionKind,
  introspect,
  makeType,
  TypeKind,
  ArrayType,
  cardinalityUtil,
  ObjectType,
  OperatorKind,
  TypeSet,
} from "../reflection";
import {set} from "./set";
import {isImplicitlyCastableTo} from "@generated/castMaps";
import {literal} from "./literal";

export type $expr_Function<
  Name extends string = string,
  Args extends (BaseTypeSet | undefined)[] = (BaseTypeSet | undefined)[],
  NamedArgs extends {[key: string]: BaseTypeSet} = {
    [key: string]: BaseTypeSet;
  },
  ReturnType extends BaseTypeSet = BaseTypeSet
> = Expression<{
  __element__: ReturnType["__element__"];
  __cardinality__: ReturnType["__cardinality__"];
  __kind__: ExpressionKind.Function;
  __name__: Name;
  __args__: Args;
  __namedargs__: NamedArgs;
}>;

export type $expr_Operator<
  Name extends string = string,
  OpKind extends OperatorKind = OperatorKind,
  Args extends TypeSet[] = TypeSet[],
  ReturnType extends TypeSet = TypeSet
> = Expression<{
  __element__: ReturnType["__element__"];
  __cardinality__: ReturnType["__cardinality__"];
  __kind__: ExpressionKind.Operator;
  __name__: Name;
  __opkind__: OpKind;
  __args__: Args;
}>;

interface OverloadFuncArgDef {
  typeId: string;
  optional?: boolean;
  setoftype?: boolean;
  variadic?: boolean;
}

interface OverloadFuncDef {
  kind?: string;
  args: OverloadFuncArgDef[];
  namedArgs?: {[key: string]: OverloadFuncArgDef};
  returnTypeId: string;
  returnTypemod?: "SetOfType" | "OptionalType";
  preservesOptionality?: boolean;
}

export function $resolveOverload(
  args: any[],
  typeSpec: introspect.Types,
  funcDefs: OverloadFuncDef[]
) {
  const [positionalArgs, namedArgs] =
    typeof args[0] === "object" && typeof args[0].__kind__ === "undefined"
      ? [args.slice(1), args[0]]
      : [args, undefined];

  for (const def of funcDefs) {
    const resolvedOverload = _tryOverload(
      positionalArgs,
      namedArgs,
      typeSpec,
      def
    );
    if (resolvedOverload !== null) {
      return resolvedOverload;
    }
  }
  throw new Error("No matching function overload found");
}

function _tryOverload(
  args: (BaseTypeSet | undefined)[],
  namedArgs: {[key: string]: BaseTypeSet} | undefined,
  typeSpec: introspect.Types,
  funcDef: OverloadFuncDef
): {
  kind?: string;
  returnType: BaseType;
  cardinality: Cardinality;
  args: BaseTypeSet[];
  namedArgs: {[key: string]: BaseTypeSet};
} | null {
  if (
    (funcDef.namedArgs === undefined && namedArgs !== undefined) ||
    (namedArgs === undefined &&
      funcDef.namedArgs &&
      Object.values(funcDef.namedArgs).some(arg => !arg.optional))
  ) {
    return null;
  }

  const lastParamVariadic = funcDef.args[funcDef.args.length - 1]?.variadic;
  if (!lastParamVariadic && args.length > funcDef.args.length) {
    return null;
  }

  const paramCardinalities: [Cardinality, ...Cardinality[]] = [
    Cardinality.One,
  ];

  if (namedArgs) {
    for (const [key, value] of Object.entries(namedArgs)) {
      const argDef = funcDef.namedArgs?.[key];
      if (
        !argDef ||
        !compareType(typeSpec, argDef.typeId, value.__element__).match
      ) {
        return null;
      }

      paramCardinalities.push(
        argDef.setoftype
          ? funcDef.preservesOptionality
            ? cardinalityUtil.overrideUpperBound(value.__cardinality__, "One")
            : Cardinality.One
          : argDef.optional
          ? cardinalityUtil.overrideLowerBound(value.__cardinality__, "One")
          : value.__cardinality__
      );
    }
  }

  const positionalArgs: BaseTypeSet[] = [];

  let returnAnytype: BaseType | undefined;

  for (let i = 0; i < funcDef.args.length; i++) {
    const argDef = funcDef.args[i];
    const arg = args[i];

    if (arg === undefined) {
      if (!argDef.optional) {
        return null;
      }

      if (i < args.length) {
        // arg is explicitly undefined, inject empty set
        const argType = makeType<any>(typeSpec, argDef.typeId, literal);
        positionalArgs.push(set(argType));
      }
    } else {
      const {match, anytype} = compareType(
        typeSpec,
        argDef.typeId,
        arg.__element__
      );

      if (!match) {
        return null;
      }
      if (!returnAnytype && anytype) {
        returnAnytype = anytype;
      }

      positionalArgs.push(
        ...(argDef.variadic ? (args.slice(i) as BaseTypeSet[]) : [arg])
      );
      if (argDef.setoftype) {
        paramCardinalities.push(
          funcDef.preservesOptionality
            ? cardinalityUtil.overrideUpperBound(arg.__cardinality__, "One")
            : Cardinality.One
        );
      } else {
        const card = argDef.variadic
          ? cardinalityUtil.multiplyCardinalitiesVariadic(
              (args.slice(i) as BaseTypeSet[]).map(
                el => el.__cardinality__
              ) as [Cardinality, ...Cardinality[]]
            )
          : arg.__cardinality__;

        paramCardinalities.push(
          argDef.optional
            ? cardinalityUtil.overrideLowerBound(card, "One")
            : card
        );
      }
    }
  }

  let cardinality =
    funcDef.returnTypemod === "SetOfType"
      ? Cardinality.Many
      : cardinalityUtil.multiplyCardinalitiesVariadic(paramCardinalities);

  if (
    funcDef.returnTypemod === "OptionalType" &&
    !funcDef.preservesOptionality
  ) {
    cardinality = cardinalityUtil.overrideLowerBound(cardinality, "Zero");
  }

  return {
    kind: funcDef.kind,
    returnType: makeType(
      typeSpec,
      funcDef.returnTypeId,
      literal,
      returnAnytype
    ),
    cardinality,
    args: positionalArgs,
    namedArgs: namedArgs ?? {},
  };
}

function compareType(
  typeSpec: introspect.Types,
  typeId: string,
  arg: BaseType
): {match: boolean; anytype?: BaseType} {
  const type = typeSpec.get(typeId);

  if (type.name === "anytype") {
    return {match: true, anytype: arg};
  }

  if (type.kind === "scalar") {
    return {
      match:
        arg.__kind__ === TypeKind.scalar &&
        (arg.__name__ === type.name ||
          isImplicitlyCastableTo(arg.__name__, type.name)),
    };
  }
  if (type.kind === "array") {
    if (arg.__kind__ === TypeKind.array) {
      return compareType(
        typeSpec,
        type.array_element_id,
        (arg as any as ArrayType).__element__ as BaseType
      );
    }
  }
  if (type.kind === "object") {
    if (arg.__kind__ !== TypeKind.object) return {match: false};

    const objectArg = arg as ObjectType;
    let match = true;

    // shape comparison
    for (const ptr of type.pointers) {
      if (objectArg.__pointers__[ptr.name]) {
        const argPtr = objectArg.__pointers__[ptr.name];
        const ptrTarget = typeSpec.get(ptr.target_id);
        if (
          ptrTarget.name !== argPtr.target.__name__ ||
          ptr.real_cardinality !== argPtr.cardinality
        ) {
          match = false;
        }
      }
    }

    return {
      match,
    };
  }
  if (type.kind === "tuple") {
    const items =
      arg.__kind__ === TypeKind.tuple
        ? (arg as any).__items__
        : arg.__kind__ === TypeKind.namedtuple
        ? (arg as any).__shape__
        : null;
    if (items) {
      const keys = Object.keys(items);

      if (keys.length === type.tuple_elements.length) {
        let anytype: BaseType | undefined;
        for (let i = 0; i < keys.length; i++) {
          if (keys[i] !== type.tuple_elements[i].name) {
            return {match: false};
          }
          const {match: m, anytype: a} = compareType(
            typeSpec,
            type.tuple_elements[i].target_id,
            (items as any)[keys[i]]
          );
          if (!m) {
            return {match: false};
          }
          if (a) anytype = a;
        }
        return {match: true, anytype};
      }
    }
  }

  return {match: false};
}
