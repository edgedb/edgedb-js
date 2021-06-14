CREATE MIGRATION m1iin5v3q4nj5wcfo7mu53itprsvxvvltlf7dblux5t4bfxtkcsyjq
    ONTO initial
{
  CREATE ABSTRACT TYPE default::Person {
      CREATE REQUIRED PROPERTY name -> std::str {
          CREATE CONSTRAINT std::exclusive;
      };
  };
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
  CREATE TYPE default::Movie {
      CREATE MULTI LINK characters -> default::Person;
      CREATE REQUIRED PROPERTY title -> std::str;
  };
};
