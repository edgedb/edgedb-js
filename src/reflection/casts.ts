import {Connection} from "../ifaces";

type Cast = {
  source: string;
  target: string;
  allow_assignment: boolean;
  allow_implicit: boolean;
};

const mode: "shallow" = "shallow";
export const getCasts = async (cxn: Connection) => {
  const QUERY = `WITH MODULE schema
        SELECT Cast {
            source := .from_type.name,
            target := .to_type.name,
            allow_assignment,
            allow_implicit,
        }
        FILTER .from_type IS ScalarType AND .to_type IS ScalarType`;

  const allCasts: Cast[] = await cxn.query(QUERY);

  // initialize castsBySource and types
  const types = new Set<string>();
  const castsBySource: {[k: string]: Cast[]} = {};
  for (const cast of allCasts) {
    types.add(cast.source);
    types.add(cast.target);
    castsBySource[cast.source] = castsBySource[cast.source] || [];
    castsBySource[cast.target] = castsBySource[cast.target] || [];
  }

  const implicitCasts = allCasts.filter((c) => c.allow_implicit);

  for (const cast of implicitCasts) {
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

  const castsFrom: {[k: string]: string[]} = {};
  for (const type of [...types]) {
    castsFrom[type] = reachableFrom(type);
  }
  // console.log(JSON.stringify(castsFrom, null, 2));
  return castsFrom;
  // return castsResult;
};
