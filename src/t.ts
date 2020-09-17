type Params = {
  p1: string;
  p2: string;
};

type AllOptional<T extends object> = {
  [K in keyof T]: T[K];
};

const tmp = <P extends AllOptional<Params>>(params: P): number => {
  return 42;
};

// const tmp = (params: AllOptional<Params>): number => {
//   return 42;
// };

const r0 = tmp({p1: "aaa"});
const r1 = tmp({p1: "aaa", bogus: 123});
const r2 = tmp({p1: "aaa", p2: "bbb", bogus: 123});
