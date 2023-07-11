CREATE MIGRATION m1bffqrfcj7ols7s3v27kgbxhtsetpvwvqpxrogvhsq2crwwlnbbya
    ONTO m1sxhoqfjqn7vtpmatzanmwydtxndf3jlf33npkblmya42fx3bcdoa
{
  CREATE TYPE default::W {
      CREATE PROPERTY a -> std::str;
      CREATE PROPERTY d -> std::float64;
  };
  ALTER TYPE default::Z {
      ALTER LINK xy {
          SET TYPE ((default::Y | default::X) | default::W) USING (SELECT
              default::X 
          LIMIT
              1
          );
      };
  };
};
