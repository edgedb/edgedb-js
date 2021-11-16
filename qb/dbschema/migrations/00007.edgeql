CREATE MIGRATION m1hyw3hadkzkxmj62u5q7nfpopqmrfftvzzal6sm7yhle7ueqnqg5q
    ONTO m1sde65gqficjkctntdorsaovhyo3aaiiqtw2fvktmotmyayebljya
{
  CREATE ABSTRACT TYPE default::HasAge {
      CREATE PROPERTY age -> std::int64;
  };
  CREATE ABSTRACT TYPE default::HasName {
      CREATE PROPERTY name -> std::str;
  };
  ALTER TYPE default::Bag EXTENDING default::HasName,
  default::HasAge LAST;
  CREATE TYPE default::Simple EXTENDING default::HasName, default::HasAge;
};
