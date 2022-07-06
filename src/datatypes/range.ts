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

import {Duration, LocalDate, LocalDateTime} from "./datetime";

export class Range<
  T extends number | Date | LocalDate | LocalDateTime | Duration
> {
  private _isEmpty = false;

  constructor(
    private readonly _lower: T | null,
    private readonly _upper: T | null,
    private readonly _incLower: boolean = true,
    private readonly _incUpper: boolean = false
  ) {}

  get lower() {
    return this._lower;
  }
  get upper() {
    return this._upper;
  }
  get incLower() {
    return this._incLower;
  }
  get incUpper() {
    return this._incUpper;
  }
  get isEmpty() {
    return this._isEmpty;
  }

  static empty() {
    const range = new Range(null, null);
    range._isEmpty = true;
    return range;
  }

  toJSON() {
    return {
      lower: this._lower,
      upper: this._upper,
      inc_lower: this._incLower,
      inc_upper: this._incUpper,
    };
  }
}
