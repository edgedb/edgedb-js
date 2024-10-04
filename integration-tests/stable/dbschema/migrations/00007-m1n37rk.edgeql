CREATE MIGRATION m1n37rkzwbdej2nsfr73ujxlwjaum7zhqsaovf7l2sdw2g4dnayfqq
    ONTO m1jam5floeagobzgdf3lgaggi5minumxr2u27n7olum4csorly6tla
{
  ALTER TYPE default::Content {
      ALTER PROPERTY index {
          RENAME TO year;
      };
  };
  ALTER TYPE default::User {
      ALTER LINK watching_list {
          USING (SELECT
              (.movies UNION .shows)
          ORDER BY
              .year ASC
          );
      };
  };
};
