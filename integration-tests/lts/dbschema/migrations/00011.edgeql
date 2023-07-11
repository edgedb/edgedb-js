CREATE MIGRATION m1kdvcuojq6vgxpucribmqil4m37qs42ka2sptulit4cyhp5rin3xa
    ONTO m1lccxfwyed4xme7tj2xfczz5uciblizx3brasaovkm6hbtn2yoxua
{
  ALTER TYPE default::Bag {
      CREATE PROPERTY rangeField -> range<std::int64>;
  };
};
