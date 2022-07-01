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

import {LocalDate, LocalDateTime} from "./datetime";

export class Range<T extends number | Date | LocalDate | LocalDateTime> {
  constructor(
    public readonly lower: T,
    public readonly upper: T,
    public readonly incLower: boolean = true,
    public readonly incUpper: boolean = false
  ) {}

  toJSON() {
    return {
      lower: this.lower,
      upper: this.upper,
      inc_lower: this.incLower,
      inc_upper: this.incUpper,
    };
  }
}
