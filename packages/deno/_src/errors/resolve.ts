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

import * as errors from "./index.ts";
import {ErrorType} from "./base.ts";
import {errorMapping} from "./map.ts";

export function resolveErrorCode(code: number): ErrorType {
  let result: ErrorType | undefined;

  result = errorMapping.get(code);
  if (result) {
    return result;
  }

  code = code & 0xff_ff_ff_00;
  result = errorMapping.get(code);
  if (result) {
    return result;
  }

  code = code & 0xff_ff_00_00;
  result = errorMapping.get(code);
  if (result) {
    return result;
  }

  code = code & 0xff_00_00_00;
  result = errorMapping.get(code);
  if (result) {
    return result;
  }

  return errors.EdgeDBError;
}
