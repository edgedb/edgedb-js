import * as schema from "./aaa2";

const b = schema.test.Issue.watchers;
console.log(schema.test.Issue.kk, "------------", b);

// const a = schema.test.Issue.shape({
//   name: true,
//   tags: true,
//   number: true,
//   due_date: true,
//   owner: {
//     name: true,
//     todo: {
//       body: true,
//     },
//   },
//   priority: {
//     name: true,
//   },
//   // owner: {
//   //   todo: {
//   //     name: true,
//   //     references: {
//   //       title1: true,
//   //       title2: true,
//   //       id: true,
//   //     },
//   //   },
//   // },
// });
