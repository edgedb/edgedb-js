import {Connection} from "../ifaces";

type Cast = {
  source: string;
  target: string;
  allow_assignment: boolean;
  allow_implicit: boolean;
};
export const getCasts = async (cxn: Connection) => {
  const QUERY = `WITH MODULE schema
        SELECT Cast {
            source := .from_type.name,
            target := .to_type.name,
            allow_assignment,
            allow_implicit,
        }
        FILTER .from_type IS ScalarType AND .to_type IS ScalarType`;

  const castsResult: Cast[] = await cxn.query(QUERY);
  // console.log(JSON.stringify(castsResult, null, 2));

  const castsBySource: {[k: string]: Cast[]} = {};
  const implicitCasts = castsResult.filter((c) => c.allow_implicit);

  const types = new Set<string>();
  for (const cast of implicitCasts) {
    types.add(cast.source);
    types.add(cast.target);
  }

  for (const cast of implicitCasts) {
    castsBySource[cast.source] = castsBySource[cast.source] || [];
    castsBySource[cast.source].push(cast);
  }

  const reachableFrom: (source: string) => string[] = (source: string) => {
    const reachable = new Set<string>();
    (castsBySource[source] || []).map((cast) => {
      reachable.add(cast.target);
      for (const item of reachableFrom(cast.target)) {
        reachable.add(item);
      }
    });
    return [...reachable];
  };

  console.log(`ALL TYPES`);
  console.log([...types]);

  const castsFrom: {[k: string]: string[]} = {};
  for (const type of [...types]) {
    castsFrom[type] = reachableFrom(type);
  }
  // console.log(JSON.stringify(castsFrom, null, 2));
  return castsFrom;
  // return castsResult;
};
