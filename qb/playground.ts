// tslint:disable:no-console
import e from "./generated/example";

const skip = e.select(e.int64(10)).limit(2);
const remainingHeros = e
  .select(e.Hero)
  .orderBy(e.Hero.id)
  .offset(skip)
  .limit(0);
const pageResults = e
  .select(remainingHeros, {
    id: true,
    name: true,
  })
  .limit(8);

const query = e.select(e.std.FreeObject, {
  // id: true,
  id: true,
  skip,
  remainingHeros,
  pageResults,
  nextOffset: e.plus(skip, e.count(pageResults)),
  hasMore: e.select(e.gt(e.count(remainingHeros), e.int64(10))),
});

type query = typeof query;
type params = query["__element__"]["__params__"];
type returntype = query["__element__"]["__tstype__"];

export {};
