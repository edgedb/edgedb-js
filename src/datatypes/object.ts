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
import {introspectMethod, ObjectFieldInfo} from "./introspect";

export type ObjectShape<T = any> = {readonly [K in keyof T]-?: T[K]} & {
  readonly id: string;
};

export type ObjectConstructor = new () => object;

export const EDGE_POINTER_IS_IMPLICIT = 1 << 0;
export const EDGE_POINTER_IS_LINKPROP = 1 << 1;

export function generateType(
  names: string[],
  flags: number[]
): ObjectConstructor {
  /* See the explanation for why we generate classes in `namedtuple.ts`.
   * In this particular case, we could just use an object literal or
   * a custom "edgedb.Object" class, but we still want to have
   * high-performance toJSON() implementation.  We also don't want
   * to store fields' names anywhere in the object itself.
   */

  const buf = [
    `'use strict';

    class Object {
      constructor() {
    `,
  ];

  const introFields: ObjectFieldInfo[] = [];
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    buf.push(`this[${JSON.stringify(name)}] = null;`);
    introFields.push({
      name,
      implicit: !!(flags[i] & EDGE_POINTER_IS_IMPLICIT),
      linkprop: !!(flags[i] & EDGE_POINTER_IS_LINKPROP),
    });
  }

  buf.push(`
      }

      [introspectMethod]() {
        return {
          kind: 'object',
          fields: introFields
        }
      }

      [inspect.custom](depth, options) {
        const buf = [options.stylize('Object', 'name'), ' [ '];
        const fieldsBuf = [];
        for (let i = 0; i < names.length; i++) {
          const name = names[i];
          const flag = flags[i];
          if ((flag & IMPLICIT) && !options.showHidden) {
            continue;
          }
          const val = this[name];
          const repr = inspect(
            val,
            options.showHidden,
            depth + 1,
            options.colors
          );
          fieldsBuf.push(options.stylize(name, 'name') + ' := ' + repr);
        }
        buf.push(fieldsBuf.join(', '));
        buf.push(' ]');
        return buf.join('');
      }

      toJSON() {
        return {
  `);

  let numOfJsonFields = 0;
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    const flag = flags[i];
    if (flag & EDGE_POINTER_IS_IMPLICIT) {
      continue;
    }
    const sname = JSON.stringify(name);
    buf.push(`${sname}: this[${sname}],`);
    numOfJsonFields++;
  }
  if (!numOfJsonFields) {
    buf.push(`id: this.id,`);
  }

  buf.push(`
        }
      }
    };
    return Object;
  `);

  const code = buf.join("\n");
  const params: string[] = [
    "names",
    "flags",
    "IMPLICIT",
    "inspect",
    "introspectMethod",
    "introFields",
  ];
  const args: any[] = [
    names,
    flags,
    EDGE_POINTER_IS_IMPLICIT,
    inspect,
    introspectMethod,
    introFields,
  ];
  return exec(params, args, code) as ObjectConstructor;
}

function exec(params: string[], args: any[], code: string): any {
  const func = new Function(...params, code);
  return func(...args);
}
