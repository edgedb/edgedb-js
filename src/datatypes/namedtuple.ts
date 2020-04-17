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

export type NamedTuple<T = any> = {
  readonly [_: number]: any;
} & {
  readonly length: number;
} & {readonly [K in keyof T]-?: T[K]} &
  Iterable<any>;

export type NamedTupleConstructor = new (len: number) => any[];

export function generateType(names: string[]): NamedTupleConstructor {
  /* Generate a NamedTuple specialized for the given *names* sequence.
   *
   * We need to create a named tuple.  Unfortunately, contrary to
   * Python, we don't have a magic `__getattr__` method.  Using
   * JS Proxies is prohibitively slow.
   *
   * First, let's list the requirements: we want the named tuple
   * to be fast to create (a), fast to populate with data (b), fast to
   * access the fields' values (c), being able to refer to the tuple's
   * fields by both *indexes* and *names*.  In addition to that, we
   * also want to customize how named tuples are serialized into
   * JSON, and we should ensure that they are printed correctly when
   * introspected via console.log().
   *
   * We basically have two options: use an array (or a subclass of
   * an array) or use an object.  Using the latter is way slower
   * across all operations.  So we want to stick to arrays.
   *
   * Options to create a named tuple based on array type:
   *
   * 1. Create a regular array.  Set both indexes and named properties
   *    on it directly:
   *
   *       tup = new Array(N);
   *       tup[0] = val0;
   *       tup[field0] = val0;
   *       // etc.
   *
   *    This option works relatively well, but isn't ideal: we do
   *    2x more "assign" operations.  We also still need to customize
   *    toJSON() and [inspect] hooks.  Further assignment to the
   *    object may skew its hidden class which will be detrimental
   *    to the performance.
   *
   *    Still, this is a viable option, albeit, not ideal.
   *
   * 2. Create an Object and populate it with numeric and named fields,
   *    e.g.:
   *
   *       tup = {}
   *       tup[0] = val0;
   *       tup[field0] = val0;
   *       // etc.
   *
   *    It appears that as soon as a numeric property is assigned to
   *    an object, V8 thinks that it should be converted to an Array
   *    (or deoptimized, I'm not sure).  The performance of accessing
   *    fields degrades drastically.  Not an option, at least in
   *    NodeJS 10.
   *
   * 3. Create an array subclass dynamically via setting __proto__,
   *    regular prototype inheritance, or using Object.setPrototypeOf.
   *    Unfortunately, generated array subtypes are more than 10x
   *    slower than regular arrays (even created via (1)).  So this is
   *    a non-option.
   *
   * 4. Create an array subclass with all extra methods/getters via
   *    "eval()" or "new Function()".  While using "eval()" can be a
   *    bad sign, I believe that in this case it's well justified.
   *    The performance of generated array subtype is the same as
   *    of a regular Array.  We do 2x less assignments than with (1),
   *    *and* we can be flexible with extending the functionality
   *    of the generated subtype.
   *
   *    Essentially, for a named tuple `(a := 1, b := 'aaa')` the
   *    following array subtype will be generated:
   *
   *       class NameTuple extends BaseNamedTuple {
   *         toJSON() {
   *           return {"a": this[0], "b": this[1]};
   *         }
   *
   *         get ["a"]() { return this[0]; }
   *
   *         get ["b"]() { return this[1]; }
   *       }
   *
   *    V8 JIT has apparently no problem with optimizing the above
   *    generated class.
   *
   *    Lastly, as with any "eval()", we need to make sure that a user
   *    data cannot interfere with the code we evaluating.  In this
   *    case, a user data consists of names of the fields, that can
   *    be arbitrary (e.g. contain JS keywords or even code.)
   *    To mitigate that, we use `JSON.stringify()` to escape all
   *    field names we compile into the source code (see the above
   *    example.)
   *
   *  Given all the alternatives we go with option (4).
   *
   *  With all that said, please observe the below code in all
   *  its glory!
   */

  const buf = [
    `'use strict';

    class NamedTuple extends Array {

      [introspectMethod]() {
        return {
          kind: 'namedtuple',
          fields: introFields
        }
      }

      [inspect.custom](depth, options) {
        const buf = [options.stylize('NamedTuple', 'name'), ' [ '];
        const fieldsBuf = [];
        for (const name of names) {
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
    `,
  ];

  const introFields: FieldInfo[] = [];
  for (let i = 0; i < names.length; i++) {
    buf.push(`${JSON.stringify(names[i])}: this[${i}],`);
    introFields.push({name: names[i]});
  }

  buf.push(`
    }
  }
  `);

  for (let i = 0; i < names.length; i++) {
    buf.push(`
      get [${JSON.stringify(names[i])}]() {
        return this[${i}];
      }
    `);
  }
  buf.push(`
    };
    return NamedTuple;
  `);

  const code = buf.join("\n");
  const params: string[] = [
    "names",
    "inspect",
    "introspectMethod",
    "introFields",
  ];
  const args: any[] = [names, inspect, introspectMethod, introFields];
  return exec(params, args, code) as NamedTupleConstructor;
}

function exec(params: string[], args: any[], code: string): any {
  const func = new Function(...params, code);
  return func(...args);
}
