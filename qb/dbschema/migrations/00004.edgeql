CREATE MIGRATION m15beoho5bjejmlmbvf4lxmxebksdqbktggbkiohkbcipzjtqo4ola
    ONTO m13wjddw5v2qop66go76ghzefhhr3pa6ojc336sjyff6ticrbrynla
{
  CREATE SCALAR TYPE default::bag_seq EXTENDING std::sequence;
  ALTER TYPE default::Bag {
      CREATE PROPERTY seqField -> default::bag_seq;
  };
};
