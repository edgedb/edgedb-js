import {EdgeDBError, Tag} from "./base";
import {ErrorType} from "./base";
import * as errors from "./index";

class ListTag implements Tag {
  classes: ErrorType[];
  constructor(classes: ErrorType[]) {
    this.classes = classes;
  }
  isMatching(err: EdgeDBError): boolean {
    return this.classes.some((type) => err instanceof type);
  }
}

export const SHOULD_RECONNECT = new ListTag([
  errors.ConnectionFailedTemporarilyError,
  errors.ConnectionTimeoutError,
]);
