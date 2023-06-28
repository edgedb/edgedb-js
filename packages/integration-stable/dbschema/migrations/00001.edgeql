CREATE MIGRATION m1vezvqx3yt5wywukcmpmgjnhu2uwuxcgmvm2di4bh42yvqgw7xfja
    ONTO initial
{
  CREATE EXTENSION pgvector VERSION '0.4';
  CREATE SCALAR TYPE default::embedding EXTENDING ext::pgvector::vector<1234>;
  CREATE TYPE default::PgVectorTest {
      CREATE PROPERTY test_embedding: default::embedding;
  };
};
