CREATE MIGRATION m1maaoaoiqpyt6c3kazgkq37pyeywkk2cnyhheaffxvwtmdm7hc3zq
    ONTO m1ydtkm45tq7rjqvezteernbezvixdebguannxxrcfruk4tygtz7fa
{
  ALTER TYPE default::Bag {
      CREATE PROPERTY enumArr -> array<default::Genre>;
  };
};
