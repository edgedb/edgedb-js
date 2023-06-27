CREATE MIGRATION m1yg2okbivunkolgbdsz43aktxfipd47wmaxp4cq3kaq5giox5jqvq
    ONTO m1f64d3rv37gimlrzqnmbcw3wehfrigsm3dvqohdxbv6wrz4gkvrqq
{
  CREATE SCALAR TYPE default::year EXTENDING std::int16 {
      CREATE CONSTRAINT std::min_value(1878);
  };
  ALTER TYPE default::Movie {
      ALTER PROPERTY release_year {
          SET TYPE default::year;
      };
  };
};
