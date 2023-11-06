CREATE MIGRATION m1rn5yebzwvfjxj5hvugtrug3o7jzhncvdhobjedw24wsni6v3l6ia
    ONTO m1bffqrfcj7ols7s3v27kgbxhtsetpvwvqpxrogvhsq2crwwlnbbya
{
  CREATE EXTENSION pgvector VERSION '0.4';
  CREATE SCALAR TYPE default::embedding EXTENDING ext::pgvector::vector<1234>;
  CREATE TYPE default::PgVectorTest {
      CREATE PROPERTY test_embedding: default::embedding;
  };
};
