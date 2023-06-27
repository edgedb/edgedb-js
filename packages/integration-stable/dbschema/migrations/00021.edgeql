CREATE MIGRATION m1lwtksdmgupjddaakscxoqarehfpdd4otb5yjaq5knweuepah4a7a
    ONTO m1sxhoqfjqn7vtpmatzanmwydtxndf3jlf33npkblmya42fx3bcdoa
{
  CREATE EXTENSION pgvector VERSION '0.4';
  CREATE SCALAR TYPE default::embedding EXTENDING ext::pgvector::vector<1234>;
  CREATE TYPE default::PgVectorTest {
      CREATE PROPERTY test_embedding: default::embedding;
  };
};
