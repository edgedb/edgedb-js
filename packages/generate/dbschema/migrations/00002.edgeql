CREATE MIGRATION m17u5iclyhikkz2ww5mwvqouwdo3k2o7pfaov32pai6asffsecvoca
    ONTO m1qxdmnjre6ij6fj5u7qyvwkzcdgg33qygdldy6ntl6o24ls7yq5xa
{
  ALTER TYPE default::Movie {
      CREATE REQUIRED PROPERTY release_year -> std::int16 {
          SET default := (<std::int16>std::datetime_get(std::datetime_current(), 'year'));
      };
  };
};
