import {BaseTypeSet, Expression, TypeSet} from "./typesystem.ts";
import {ExpressionKind, OperatorKind} from "./enums.ts";

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
