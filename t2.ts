import * as schema from "./aaa";

const a = schema.test.Issue.shape({
  name: true,
  tags: true,
  number: true,
  due_date: true,
  owner: {
    name: true,
    todo: {
      body: true,
    },
  },
  priority: {
    name: true,
  },
  // owner: {
  //   todo: {
  //     name: true,
  //     references: {
  //       title1: true,
  //       title2: true,
  //       id: true,
  //     },
  //   },
  // },
});
