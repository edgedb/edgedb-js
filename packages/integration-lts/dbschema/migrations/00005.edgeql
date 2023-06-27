CREATE MIGRATION m1u6lpszc2ef6z6zsx4ovnug42un3gfjmadwhjfm47du3ext3vpaoq
    ONTO m15beoho5bjejmlmbvf4lxmxebksdqbktggbkiohkbcipzjtqo4ola
{
  CREATE TYPE default::User {
      CREATE REQUIRED LINK favourite_movie -> default::Movie;
      CREATE REQUIRED PROPERTY username -> std::str;
  };
};
