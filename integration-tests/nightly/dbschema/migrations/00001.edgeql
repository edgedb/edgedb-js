CREATE MIGRATION m1rlwpc5ikrkb7cvylhbcntglvnanm524yb6si5xlcjk6gd2lczugq
    ONTO initial
{
  CREATE TYPE default::WithMultiRange {
      CREATE REQUIRED PROPERTY ranges: multirange<std::int32>;
  };
};
