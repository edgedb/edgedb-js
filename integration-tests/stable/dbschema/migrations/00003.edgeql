CREATE MIGRATION m1gpgodwlufmynnx3krhcpkvv535c2vcwilfx362gfkqysxn3jbpba
    ONTO m12evwm6rr42tlopb24nknjtndujawkkkwkne2zlbyg7ocv6hzwlla
{
  CREATE TYPE default::WithMultiRange {
      CREATE REQUIRED PROPERTY ranges: multirange<std::int32>;
  };
};
