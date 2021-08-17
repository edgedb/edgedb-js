// tslint:disable:no-console
// import {select} from "@syntax/select";
import {setToTsType} from "reflection";
import e from "./generated/example";

const skip = e.int64(10);
const remainingHeros = e.select(e.Hero).orderBy(e.Hero.id).offset(skip);
const pageResults = e
  .select(remainingHeros, {
    id: true,
    name: true,
  })
  .limit(10);

const query = e.select(e.std.FreeObject, {
  id: true,
  pageResults,
  nextOffset: e.plus(skip, e.count(pageResults)),
  hasMore: e.select(e.gt(e.count(remainingHeros), e.int64(10))),
});
//

type query = typeof query;
type params = query["__element__"]["__params__"];
type returntype = query["__element__"]["__tstype__"];

export {};
