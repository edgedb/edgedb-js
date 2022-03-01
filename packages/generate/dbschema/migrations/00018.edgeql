CREATE MIGRATION m1j6yidiiae7thrsrtlajwzgbmzuwuhsoeikzxje4ok4dpka7lyhha
    ONTO m1yg2okbivunkolgbdsz43aktxfipd47wmaxp4cq3kaq5giox5jqvq
{
  CREATE TYPE default::X {
      CREATE PROPERTY a -> std::str;
      CREATE PROPERTY b -> std::int32;
  };
  CREATE TYPE default::Y {
      CREATE PROPERTY a -> std::str;
      CREATE PROPERTY c -> std::bool;
  };
  CREATE TYPE default::Z {
      CREATE LINK xy -> (default::Y | default::X);
  };
};
