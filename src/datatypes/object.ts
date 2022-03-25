/*!
 * This source file is part of the EdgeDB open source project.
 *
 * Copyright 2019-present MagicStack Inc. and the EdgeDB authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {inspect} from "../compat";
import {introspectMethod, ObjectFieldInfo, FieldName} from "./introspect";

export type ObjectShape<T = any> = {readonly [K in keyof T]-?: T[K]} & {
  readonly id: string;
};

export type ObjectConstructor = () => object;

export const EDGE_POINTER_IS_IMPLICIT = 1 << 0;
export const EDGE_POINTER_IS_LINKPROP = 1 << 1;

export function generateType(
  names: string[],
  flags: number[]
): [FieldName[], ObjectConstructor] {
  const newNames: FieldName[] = new Array(names.length);
  const introFields: ObjectFieldInfo[] = [];
  for (let i = 0; i < names.length; i++) {
    let name: FieldName = names[i];
    if (flags[i] & EDGE_POINTER_IS_LINKPROP) {
      name = `@${name}`;
    } else if (flags[i] & EDGE_POINTER_IS_IMPLICIT) {
      name = Symbol.for(name);
    }

    newNames[i] = name;
    introFields.push({
      name,
      implicit: !!(flags[i] & EDGE_POINTER_IS_IMPLICIT),
      linkprop: !!(flags[i] & EDGE_POINTER_IS_LINKPROP),
    });
  }

  const constructor = () => {
    return {
      [introspectMethod]() {
        return {
          kind: "object",
          fields: introFields,
        };
      },

      [inspect.custom](_depth: any, options: any) {
        // Construct a temporary object to run the inspect code on.
        // This way we can hide the '[introspectMethod]' and other
        // custom fields/methods from the user as they can be
        // confusing. The logged output will look as if this is
        // a plain JS object.
        const toPrint: any = {};
        for (let i = 0; i < newNames.length; i++) {
          const name = newNames[i];
          if (flags[i] & EDGE_POINTER_IS_IMPLICIT) {
            continue;
          }
          toPrint[name] = (this as any)[name];
        }
        return inspect(toPrint, options);
      },
    };
  };

  return [newNames, constructor];
}
