CREATE MIGRATION m13wjddw5v2qop66go76ghzefhhr3pa6ojc336sjyff6ticrbrynla
    ONTO m17u5iclyhikkz2ww5mwvqouwdo3k2o7pfaov32pai6asffsecvoca
{
  ALTER TYPE default::Movie {
      ALTER PROPERTY title {
          CREATE CONSTRAINT std::exclusive;
      };
  };
};
