using extension pgvector;

module default {
  scalar type embedding extending ext::pgvector::vector<1234>;

  type PgVectorTest {
    test_embedding: embedding;
  }
};
