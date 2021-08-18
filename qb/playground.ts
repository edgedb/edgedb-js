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
  .limit(1);

const query = e.select(e.std.FreeObject, {
  id: true,
  skip,
  remainingHeros,
  pageResults,
  nextOffset: e.plus(skip, e.count(pageResults)),
  hasMore: e.select(e.gt(e.count(remainingHeros), e.int64(12))),
});

// const query = e.plus(
//   e.plus(
//     e.plus(
//       e.plus(e.plus(e.plus(e.int64(2), e.int64(2)), e.int64(2)), e.int64(2)),
//       e.int64(1243)
//     ),
//     e.int64(5)
//   ),
//   e.int64(4)
// );

// const query = e.select(
//   e.select(e.select(e.select(e.select(e.select(e.str("qwer" as string))))))
// );

type query = typeof query;
type params = query["__element__"];
type returntype = query["__element__"]["__tstype__"];
console.log(query);

export {};
