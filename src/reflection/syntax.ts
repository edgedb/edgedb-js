import {AnyObject, Cardinality, LinkDesc, PropertyDesc} from "./objects";
import {AnyMaterialtype, Anytype, Materialtype, TSTYPE} from "./typesystem";

export interface Set<
  T extends AnyMaterialtype = AnyMaterialtype,
  Card extends Cardinality = Cardinality
> {
  type: T;
  cardinality: Card;
}
type PathParent<Type extends AnyObject> = {type: Type; linkName: string};
type Path<Type extends AnyObject, Parent extends PathParent<any> | null> = {
  type: Type;
  parent: Parent;
};
type PathLeaf<Type extends AnyMaterialtype> = {
  __leafType: Type;
  parent: PathParent<any>;
};
type Pathify<Type extends AnyObject> = {
  [k in keyof Type["__shape__"]]: Type["__shape__"][k] extends PropertyDesc<
    any,
    any
  >
    ? PathLeaf<Type["__shape__"][k]["propertyTarget"]>
    : Type["__shape__"][k] extends LinkDesc<any, any>
    ? Path<Type["__shape__"][k]["linkTarget"], PathParent<Type>>
    : never;
};

const toPathExpression = <T extends AnyObject>(
  type: AnyObject
): Pathify<T> => {
  return "asdf" as any;
};
type Expression<Type extends Set> = {};

// export class SetExpression<Type extends Set, TSType = typeAndCardToTsType<Type['type'], Type['cardinality']>{

// }
