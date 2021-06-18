CREATE MIGRATION m1ydtkm45tq7rjqvezteernbezvixdebguannxxrcfruk4tygtz7fa
    ONTO m1jabbb4ieaq4riptb3iihzt76h4gwqdvxqli4zlx5p7abi2vme55a
{
  CREATE TYPE default::Bag {
      CREATE PROPERTY bigintField -> std::bigint;
      CREATE PROPERTY boolField -> std::bool;
      CREATE PROPERTY datetimeField -> std::datetime;
      CREATE PROPERTY decimalField -> std::decimal;
      CREATE PROPERTY durationField -> std::duration;
      CREATE PROPERTY float32Field -> std::float32;
      CREATE PROPERTY float64Field -> std::float64;
      CREATE PROPERTY genre -> default::Genre;
      CREATE PROPERTY int16Field -> std::int16;
      CREATE PROPERTY int32Field -> std::int32;
      CREATE PROPERTY int64Field -> std::int64;
      CREATE PROPERTY localDateField -> cal::local_date;
      CREATE PROPERTY localDateTimeField -> cal::local_datetime;
      CREATE PROPERTY localTimeField -> cal::local_time;
      CREATE PROPERTY namedTuple -> tuple<x: std::str, y: std::int64>;
      CREATE PROPERTY secret_identity -> std::str;
      CREATE MULTI PROPERTY stringMultiArr -> array<std::str>;
      CREATE PROPERTY stringsArr -> array<std::str>;
      CREATE REQUIRED MULTI PROPERTY stringsMulti -> std::str;
      CREATE PROPERTY unnamedTuple -> tuple<std::str, std::int64>;
  };
  ALTER TYPE default::Movie {
      DROP PROPERTY genre;
      DROP PROPERTY secret_identity;
  };
};
