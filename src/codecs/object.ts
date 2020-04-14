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
import {ICodec, Codec, uuid} from "./ifaces";
import {ReadBuffer, WriteBuffer} from "../buffer";

type ObjectConstructor = new () => object;

const EDGE_POINTER_IS_IMPLICIT = 1 << 0;
const EDGE_POINTER_IS_LINKPROP = 1 << 1;

export class ObjectCodec extends Codec implements ICodec {
  private codecs: ICodec[];
  private names: string[];
  private objectType: ObjectConstructor;

  constructor(tid: uuid, codecs: ICodec[], names: string[], flags: number[]) {
    super(tid);

    this.codecs = codecs;

    const newNames: string[] = new Array(names.length);
    for (let i = 0; i < names.length; i++) {
      if (flags[i] & EDGE_POINTER_IS_LINKPROP) {
        newNames[i] = `@${names[i]}`;
      } else {
        newNames[i] = names[i];
      }
    }
    this.names = newNames;
    this.objectType = generateObjectClass(newNames, flags);
  }

  encode(_buf: WriteBuffer, _object: any): void {
    throw new Error("Objects cannot be passed as arguments");
  }

  decode(buf: ReadBuffer): any {
    const codecs = this.codecs;
    const names = this.names;
    const objType = this.objectType;

    const els = buf.readUInt32();
    if (els !== codecs.length) {
      throw new Error(
        `cannot decode Object: expected ${codecs.length} elements, got ${els}`
      );
    }

    const elemBuf = ReadBuffer.alloc();
    const result: any = new objType();
    for (let i = 0; i < els; i++) {
      buf.discard(4); // reserved
      const elemLen = buf.readInt32();
      const name = names[i];
      let val = null;
      if (elemLen !== -1) {
        buf.sliceInto(elemBuf, elemLen);
        val = codecs[i].decode(elemBuf);
        elemBuf.finish();
      }
      result[name] = val;
    }

    return result;
  }
}

function generateObjectClass(
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

  for (const name of names) {
    buf.push(`this[${JSON.stringify(name)}] = null;`);
  }

  buf.push(`
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
  const params: string[] = ["names", "flags", "IMPLICIT", "inspect"];
  const args: any[] = [names, flags, EDGE_POINTER_IS_IMPLICIT, inspect];
  return exec(params, args, code) as ObjectConstructor;
}

function exec(params: string[], args: any[], code: string): any {
  const func = new Function(...params, code);
  return func(...args);
}
