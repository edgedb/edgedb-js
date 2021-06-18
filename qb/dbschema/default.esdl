module default {

  scalar type Genre extending enum<Horror, Action, RomCom>;

  abstract type Person {
    required property name -> str {
      constraint exclusive;
    };
  }

  type Villain extending Person {
    link nemesis -> Hero;
  }

  type Hero extending Person {
    property secret_identity -> str;
    property number_of_movies -> int64;
    multi link villains := .<nemesis[IS Villain];
  }

  type Movie {
    property rating -> float64;
    required property title -> str;
    multi link characters -> Person;
  }

  type Bag {
    property secret_identity -> str;
    property genre -> Genre;
    property boolField -> bool;
    property datetimeField -> datetime;
    property localDateField -> cal::local_date;
    property localTimeField -> cal::local_time;
    property localDateTimeField -> cal::local_datetime;
    property durationField -> duration;
    property decimalField -> decimal;
    property int64Field -> int64;
    property int32Field -> int32;
    property int16Field -> int16;
    property float32Field -> float32;
    property float64Field -> float64;
    property bigintField -> bigint;

    required multi property stringsMulti -> str;
    property stringsArr -> array<str>;
    multi property stringMultiArr -> array<str>;

    property namedTuple -> tuple<x: str, y: int64>;
    property unnamedTuple -> tuple<str, int64>;
    property enumArr -> array<Genre>;
  }
}
