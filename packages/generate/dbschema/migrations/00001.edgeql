CREATE MIGRATION m1qxdmnjre6ij6fj5u7qyvwkzcdgg33qygdldy6ntl6o24ls7yq5xa
    ONTO initial
{
  CREATE MODULE `💯💯💯` IF NOT EXISTS;
  CREATE ABSTRACT ANNOTATION default::`🍿`;
  CREATE FUNCTION default::`💯`(NAMED ONLY `🙀`: std::int64) ->  std::int64 {
      SET volatility := 'Immutable';
      CREATE ANNOTATION default::`🍿` := 'fun!🚀';
      USING (SELECT
          (100 - `🙀`)
      )
  ;};
  CREATE SCALAR TYPE default::Genre EXTENDING enum<Horror, Action, RomCom>;
  CREATE ABSTRACT TYPE default::HasAge {
      CREATE PROPERTY age -> std::int64;
  };
  CREATE ABSTRACT TYPE default::HasName {
      CREATE PROPERTY name -> std::str;
  };
  CREATE TYPE default::Bag EXTENDING default::HasName, default::HasAge {
      CREATE PROPERTY enumArr -> array<default::Genre>;
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
  CREATE ABSTRACT CONSTRAINT default::`🚀🍿`(max: std::int64) EXTENDING std::max_len_value;
  CREATE TYPE default::A;
  CREATE SCALAR TYPE default::你好 EXTENDING std::str;
  CREATE SCALAR TYPE default::مرحبا EXTENDING default::你好 {
      CREATE CONSTRAINT default::`🚀🍿`(100);
  };
  CREATE SCALAR TYPE default::`🚀🚀🚀` EXTENDING default::مرحبا;
  CREATE TYPE default::Łukasz {
      CREATE LINK `Ł💯` -> default::A {
          CREATE PROPERTY `🙀مرحبا🙀` -> default::مرحبا {
              CREATE CONSTRAINT default::`🚀🍿`(200);
          };
          CREATE PROPERTY `🙀🚀🚀🚀🙀` -> default::`🚀🚀🚀`;
      };
      CREATE REQUIRED PROPERTY `Ł🤞` -> default::`🚀🚀🚀` {
          SET default := (<default::`🚀🚀🚀`>'你好🤞');
      };
      CREATE INDEX ON (.`Ł🤞`);
  };
  CREATE TYPE default::`S p a M` {
      CREATE REQUIRED PROPERTY `🚀` -> std::int32;
      CREATE PROPERTY c100 := (SELECT
          default::`💯`(`🙀` := .`🚀`)
      );
  };
  CREATE FUNCTION `💯💯💯`::`🚀🙀🚀`(`🤞`: default::`🚀🚀🚀`) ->  default::`🚀🚀🚀` USING (SELECT
      <default::`🚀🚀🚀`>(`🤞` ++ 'Ł🙀')
  );
  CREATE ABSTRACT LINK default::movie_character {
      CREATE PROPERTY character_name -> std::str;
  };
  CREATE ABSTRACT TYPE default::Person {
      CREATE REQUIRED PROPERTY name -> std::str {
          CREATE CONSTRAINT std::exclusive;
      };
  };
  CREATE TYPE default::Profile {
      CREATE PROPERTY plot_summary -> std::str;
  };
  CREATE TYPE default::Movie {
      CREATE MULTI LINK characters EXTENDING default::movie_character -> default::Person;
      CREATE LINK profile -> default::Profile {
          CREATE CONSTRAINT std::exclusive;
      };
      CREATE PROPERTY genre -> default::Genre;
      CREATE PROPERTY rating -> std::float64;
      CREATE REQUIRED PROPERTY title -> std::str;
  };
  ALTER TYPE default::A {
      CREATE REQUIRED LINK `s p A m 🤞` -> default::`S p a M`;
  };
  CREATE TYPE default::Simple EXTENDING default::HasName, default::HasAge;
  CREATE TYPE default::Hero EXTENDING default::Person {
      CREATE PROPERTY number_of_movies -> std::int64;
      CREATE PROPERTY secret_identity -> std::str;
  };
  CREATE TYPE default::Villain EXTENDING default::Person {
      CREATE LINK nemesis -> default::Hero;
  };
  ALTER TYPE default::Hero {
      CREATE MULTI LINK villains := (.<nemesis[IS default::Villain]);
  };
  CREATE TYPE default::MovieShape;
};
