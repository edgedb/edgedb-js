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
import {introspectMethod, FieldInfo} from "./introspect";

export type NamedTuple<T = any> = {readonly [K in keyof T]-?: T[K]};

export type NamedTupleConstructor = () => any;

export function generateType(names: string[]): NamedTupleConstructor {
  const introFields: FieldInfo[] = [];
  for (const name of names) {
    introFields.push({name});
  }

  function _inspect(_depth: any, options: any) {
    // Construct a temporary object to run the inspect code on.
    // This way we can hide the '[introspectMethod]' and other
    // custom fields/methods from the user as they can be
    // confusing. The logged output will look as if this is
    // a plain JS object.
    const toPrint: any = {};
    for (const name of names) {
      // @ts-ignore
      toPrint[name] = (this as any)[name];
    }
    return inspect(toPrint, options);
  }

  return () => {
    const obj: any = {};
    Object.defineProperty(obj, introspectMethod, {
      enumerable: false,
      writable: false,
      configurable: false,
      value: {
        kind: "object",
        fields: introFields,
      },
    });
    Object.defineProperty(obj, inspect.custom, {
      enumerable: false,
      writable: false,
      configurable: false,
      value: _inspect.bind(obj),
    });

    return obj;
  };
}
