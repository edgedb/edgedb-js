CREATE MIGRATION m1uqg3po4shj6muhipacnytxgwnql52xcyt5pvtyvtzgsrcdhueqba
    ONTO initial
{
  CREATE EXTENSION pgcrypto VERSION '1.3';
  CREATE EXTENSION auth VERSION '1.0';
  CREATE FUTURE nonrecursive_access_policies;
  CREATE TYPE default::Todo {
      CREATE REQUIRED LINK owner: ext::auth::Identity {
          SET default := (std::assert_single(GLOBAL ext::auth::ClientTokenIdentity));
      };
      CREATE REQUIRED PROPERTY completed: std::bool;
      CREATE REQUIRED PROPERTY content: std::str;
  };
};
