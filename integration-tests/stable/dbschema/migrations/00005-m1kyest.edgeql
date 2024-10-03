CREATE MIGRATION m1kyestnsfpsvspbbvhujr6t2rrrul3twulxigasxcapoexfaochsq
    ONTO m1yb2nbsda4g45c5knwjqxu5gfkn44rxswjf2yld4mxpjw5tpozuja
{
  ALTER TYPE default::User {
      CREATE MULTI LINK watching_list := (SELECT
          (.movies UNION .shows)
      ORDER BY
          .index ASC
      );
  };
};
