import schema from "./aaa";

const a = schema.test.Issue.shape({
  owner: {
    name: true,
    todo: {
      name: true,
      references: {
        title1: true,
      },
    },
  },
});
