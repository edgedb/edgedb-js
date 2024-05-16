import ts from "typescript";
import fs from "node:fs";
import { createClient } from "edgedb";
import { types as getTypes } from "edgedb/dist/reflection/queries/types"

const client = createClient();
const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
const sourceFile = ts.createSourceFile(
  "alt-op.ts",
  "",
  ts.ScriptTarget.Latest,
  false,
  ts.ScriptKind.TS
);

const query = `
with module schema,
    O := (select Operator filter .operator_kind = OperatorKind.Infix and not .internal and not .abstract),
group O {
  name,
  annotations: {
    name,
    value := @value,
  } filter .name in {'std::identifier', 'std::description'},
  params: {
    name,
    kind,
    typemod,
    type_id := .type.id,
    type_name := .type.name,
  } order by @index,
  return_type: {id, name},
  return_typemod,
}
by .name;
`;

type Operator = {
  key: {
    name: string;
  };
  grouping: string[];
  elements: {
    name: string;
    annotations: {
      name: string;
      value: string;
    }[];
    params: {
      name: string;
      kind: string;
      typemod: string;
      type_id: string;
      type_name: string;
    }[];
    return_type: {
      id: string;
      name: string;
    };
    return_typemod: string;
  }[];
};

async function main() {
  const operators = await client.query<Operator>(query);
  const types = await getTypes(client);

  let infixOperators = ts.factory.createTypeLiteralNode([]);

  for (const { elements } of operators) {
    const operatorTypes = elements.reduce((acc, element) => {
      const operatorType = ts.factory.createTypeLiteralNode([
        ts.factory.createPropertySignature(
          undefined,
          ts.factory.createIdentifier("lhs"),
          undefined,
          ts.factory.createTypeReferenceNode(
            ts.factory.createQualifiedName(
              ts.factory.createIdentifier("castMaps"),
              "orScalarLiteral"
            ),
            [
              ts.factory.createTypeReferenceNode(
                ts.factory.createQualifiedName(
                  ts.factory.createIdentifier("$"),
                  "TypeSet"
                ),
                [
                  ts.factory.createTypeReferenceNode(
                    ts.factory.createIdentifier(element.params[0].type_name),
                    undefined
                  ),
                ]
              ),
            ]
          )
        ),
        ts.factory.createPropertySignature(
          undefined,
          ts.factory.createIdentifier("rhs"),
          undefined,
          ts.factory.createTypeReferenceNode(
            ts.factory.createQualifiedName(
              ts.factory.createIdentifier("castMaps"),
              "orScalarLiteral"
            ),
            [
              ts.factory.createTypeReferenceNode(
                ts.factory.createQualifiedName(
                  ts.factory.createIdentifier("$"),
                  "TypeSet"
                ),
                [
                  ts.factory.createTypeReferenceNode(
                    ts.factory.createIdentifier(element.params[1].type_name),
                    undefined
                  ),
                ]
              ),
            ]
          )
        ),
        ts.factory.createPropertySignature(
          undefined,
          ts.factory.createIdentifier("result"),
          undefined,
          ts.factory.createTypeReferenceNode(
            ts.factory.createIdentifier(element.return_type.name),
            undefined
          )
        ),
      ]);

      return ts.factory.createUnionTypeNode([...acc.types, operatorType]);
    }, ts.factory.createUnionTypeNode([]));

    infixOperators = ts.factory.createTypeLiteralNode([
      ...infixOperators.members,
      ts.factory.createPropertySignature(
        undefined,
        ts.factory.createStringLiteral(elements[0].name.split("::").at(-1)!),
        undefined,
        operatorTypes
      ),
    ]);
  }
  const lookupMap = ts.factory.createTypeAliasDeclaration(
    undefined,
    ts.factory.createIdentifier("InfixOperators"),
    undefined,
    infixOperators
  );

  const result = printer.printNode(
    ts.EmitHint.Unspecified,
    lookupMap,
    sourceFile
  );

  fs.writeFileSync("infix-operators.ts", result);
}

main();
