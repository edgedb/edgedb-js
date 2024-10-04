CREATE MIGRATION m1jam5floeagobzgdf3lgaggi5minumxr2u27n7olum4csorly6tla
    ONTO m1kyestnsfpsvspbbvhujr6t2rrrul3twulxigasxcapoexfaochsq
{
  CREATE TYPE default::Documentary {
      CREATE REQUIRED PROPERTY title: std::str;
      CREATE REQUIRED PROPERTY plot: std::str;
  };
  ALTER TYPE default::User {
      CREATE MULTI LINK documentaries: default::Documentary;
      CREATE MULTI LINK all_media := (SELECT
          ((.movies UNION .shows) UNION .documentaries)
      );
  };
};
