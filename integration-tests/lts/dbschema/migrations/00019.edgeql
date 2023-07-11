CREATE MIGRATION m1iycuov5wlzo3mivmlbnbavv6s5pwivjs2cqvjmhw3k2tagwqwzta
    ONTO m1j6yidiiae7thrsrtlajwzgbmzuwuhsoeikzxje4ok4dpka7lyhha
{
  ALTER SCALAR TYPE default::Genre EXTENDING enum<Horror, Action, RomCom, `Science Fiction`, `Select`>;
};
