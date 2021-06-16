import {Connection} from "../ifaces";

type Scalar = {
  id: string;
  name: string;
  is_abstract: boolean;
  bases: {
    id: string;
    name: string;
  }[];
  ancestors: {id: string; name: string}[];
};

const mode: "shallow" = "shallow";
export const getScalars = async (cxn: Connection) => {
  const QUERY = `WITH MODULE schema,
    SELECT Type {
      # id,
      name,
      # is_abstract,

      # bases := array_agg((
      #   SELECT Type[IS InheritingObject].bases ORDER BY @index ASC
      # ).name),
      # [IS InheritingObject].bases: {
      #   id, name
      # } ORDER BY @index ASC,

      ancestors := array_agg((
        SELECT Type[IS InheritingObject].ancestors ORDER BY @index ASC
      ).name),
      # [IS InheritingObject].ancestors: {
      #  id, name
      # } ORDER BY @index ASC,
    }
    FILTER Type IS ScalarType
    ORDER BY .name;`;

  const allScalars: Scalar[] = JSON.parse(await cxn.queryJSON(QUERY));

  return allScalars;
  // initialize castsBySource and types
  // const types = new Set<string>();
  // const castsBySource: {[k: string]: Cast[]} = {};
  // for (const cast of allScalars) {
  //   types.add(cast.source);
  //   types.add(cast.target);
  //   castsBySource[cast.source] = castsBySource[cast.source] || [];
  //   castsBySource[cast.target] = castsBySource[cast.target] || [];
  // }

  // const implicitCasts = allScalars.filter((c) => c.allow_implicit);

  // for (const cast of implicitCasts) {
  //   castsBySource[cast.source].push(cast);
  // }

  // const reachableFrom: (source: string) => string[] = (source: string) => {
  //   const reachable = new Set<string>();
  //   (castsBySource[source] || []).map((cast) => {
  //     reachable.add(cast.target);
  //     for (const item of reachableFrom(cast.target)) {
  //       reachable.add(item);
  //     }
  //   });
  //   return [...reachable];
  // };

  // const castsFrom: {[k: string]: string[]} = {};
  // for (const type of [...types]) {
  //   castsFrom[type] = reachableFrom(type);
  // }
  // // console.log(JSON.stringify(castsFrom, null, 2));
  // return castsFrom;
  // // return castsResult;
};
