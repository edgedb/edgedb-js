CREATE MIGRATION m1kvuvibdmy6m6sz4godju7rkihhdobtnf3vor3nnsm3htu2kgaeeq
    ONTO initial
{
  CREATE TYPE default::User {
      CREATE MULTI LINK friends -> default::User;
      CREATE REQUIRED PROPERTY name -> std::str;
  };
};
