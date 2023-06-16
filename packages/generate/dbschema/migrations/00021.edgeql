CREATE MIGRATION m1d4i4w3yc7m75u7zujr6kt44xcvdl755nmiivpfbcc2eknhyb6pca
    ONTO m1sxhoqfjqn7vtpmatzanmwydtxndf3jlf33npkblmya42fx3bcdoa
{
  CREATE EXTENSION pgvector VERSION '0.4';
  CREATE SCALAR TYPE default::embedding EXTENDING ext::pgvector::vector<1234>;
  ALTER TYPE default::Profile {
      CREATE PROPERTY plot_embedding: default::embedding;
  };
};
