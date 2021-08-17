// tslint:disable:no-console
import {select} from "@syntax/select";
import {setToTsType} from "reflection";
import e from "./generated/example";

const skip = e.int64(10);
const remainingHeros = select(e.Hero).orderBy(e.Hero.id).offset(skip);
const pageResults = e
  .select(remainingHeros, {
    id: true,
    name: true,
  })
  .limit(10);

type pageResultsType = setToTsType<typeof pageResults>;

const query = select(e.Hero, {
  id: true,
  simple: e.str("13r"),
  pageResults,
  // nextOffset: select(e.plus(skip, e.count(pageResults))),
  // hasMore: select(e.gt(e.count(remainingHeros), e.int64(10))),
});
type query = typeof query;
type params = query["__element__"]["__params__"];
type returntype = query["__element__"]["__tstype__"];

export {};
