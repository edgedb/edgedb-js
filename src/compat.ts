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

/* A compatibility layer for symbols/functions required in both
   browser and NodeJS environments.
*/

/* We customize the `console.log()` rendering of EdgeDB objects
   in NodeJS. In browsers, however, it's not possible to customize that,
   so we're just creating a shell of "util.inspect" so that NodeJS code
   can compile unchanged for the browser environment.
*/

interface Inspect {
  (...args: any): null;
  custom: symbol;
}

let inspect: Inspect = (() => {
  const f = () => null;
  f.custom = Symbol();
  return f;
})();

if (typeof window === "undefined") {
  // NodeJS environment.
  // tslint:disable-next-line
  const utilMod = require("util");
  inspect = utilMod.inspect;
}

export {inspect};
