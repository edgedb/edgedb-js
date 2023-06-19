CREATE MIGRATION m1u4jn5jcn65vrccu2a2ynlio44tm67exuplgdmmu4m2q2ej5u2fxa
    ONTO m1sxhoqfjqn7vtpmatzanmwydtxndf3jlf33npkblmya42fx3bcdoa
{
  CREATE ABSTRACT TYPE default::Power {
      CREATE PROPERTY name -> std::str;
  };
  CREATE TYPE default::EvilPower EXTENDING default::Power;
  ALTER TYPE default::Person {
      CREATE MULTI LINK powers -> default::Power;
  };
  CREATE ABSTRACT TYPE default::MainCharacter EXTENDING default::Person;
  ALTER TYPE default::Villain {
      DROP EXTENDING default::Person;
      EXTENDING default::MainCharacter LAST;
  };
  ALTER TYPE default::Villain {
      ALTER LINK powers {
          SET MULTI;
          SET OWNED;
          SET TYPE default::EvilPower USING (<default::EvilPower>{});
      };
  };
  CREATE TYPE default::GoodPower EXTENDING default::Power;
  ALTER TYPE default::Hero {
      DROP EXTENDING default::Person;
      EXTENDING default::MainCharacter LAST;
  };
  ALTER TYPE default::Hero {
      ALTER LINK powers {
          SET MULTI;
          SET OWNED;
          SET TYPE default::GoodPower USING (<default::GoodPower>{});
      };
  };
};
