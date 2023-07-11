CREATE MIGRATION m1sxhoqfjqn7vtpmatzanmwydtxndf3jlf33npkblmya42fx3bcdoa
    ONTO m1iycuov5wlzo3mivmlbnbavv6s5pwivjs2cqvjmhw3k2tagwqwzta
{
  ALTER TYPE default::Person {
      CREATE PROPERTY height -> std::decimal;
  };
};
