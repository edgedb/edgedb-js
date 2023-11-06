CREATE MIGRATION m12evwm6rr42tlopb24nknjtndujawkkkwkne2zlbyg7ocv6hzwlla
    ONTO m1vezvqx3yt5wywukcmpmgjnhu2uwuxcgmvm2di4bh42yvqgw7xfja
{
  CREATE EXTENSION pgcrypto VERSION '1.3';
  CREATE EXTENSION auth VERSION '1.0';
  ALTER TYPE default::PgVectorTest {
      DROP PROPERTY test_embedding;
  };
  ALTER TYPE default::PgVectorTest RENAME TO default::CryptoTest;
  ALTER TYPE default::CryptoTest {
      CREATE PROPERTY hash_sha256: std::bytes;
  };
  CREATE TYPE default::Post {
      CREATE REQUIRED PROPERTY text: std::str;
      CREATE INDEX fts::index ON (fts::with_options(.text, language := fts::Language.eng));
  };
  CREATE TYPE default::User {
      CREATE LINK identity: ext::auth::Identity;
  };
  DROP SCALAR TYPE default::embedding;
  DROP EXTENSION pgvector;
};
