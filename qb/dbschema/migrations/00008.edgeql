CREATE MIGRATION m17ohlg6m3yiwmdh6z35urrohpnj5bjzkgalv3e24kj7hmy42hfxaq
    ONTO m1hyw3hadkzkxmj62u5q7nfpopqmrfftvzzal6sm7yhle7ueqnqg5q
{
  CREATE ABSTRACT ANNOTATION default::`🍿`;
  CREATE FUNCTION default::`💯`(NAMED ONLY `🙀`: std::int64) ->  std::int64 {
      SET volatility := 'Immutable';
      CREATE ANNOTATION default::`🍿` := 'fun!🚀';
      USING (SELECT
          (100 - `🙀`)
      )
  ;};
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
  ALTER TYPE default::A {
      CREATE REQUIRED LINK `s p A m 🤞` -> default::`S p a M`;
  };
  CREATE TYPE default::MovieShape;
};
