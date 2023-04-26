CREATE MIGRATION m1rkcenp45a4waxmvoyodlrhlj7kh3hnl6rta74zsghtlsu56tlfwq
    ONTO initial
{
  CREATE FUTURE nonrecursive_access_policies;
  CREATE TYPE default::Person {
      CREATE REQUIRED PROPERTY name: std::str;
  };
};
