CREATE MIGRATION m1yb2nbsda4g45c5knwjqxu5gfkn44rxswjf2yld4mxpjw5tpozuja
    ONTO m1gpgodwlufmynnx3krhcpkvv535c2vcwilfx362gfkqysxn3jbpba
{
  CREATE ABSTRACT TYPE default::Content {
      CREATE REQUIRED PROPERTY index: std::int16;
      CREATE REQUIRED PROPERTY title: std::str;
  };
  CREATE TYPE default::Movie EXTENDING default::Content {
      CREATE REQUIRED PROPERTY plot: std::str;
  };
  CREATE TYPE default::Show EXTENDING default::Content {
      CREATE REQUIRED PROPERTY seasons: std::int16;
  };
  ALTER TYPE default::User {
      CREATE MULTI LINK movies: default::Movie;
      CREATE MULTI LINK shows: default::Show;
  };
};
