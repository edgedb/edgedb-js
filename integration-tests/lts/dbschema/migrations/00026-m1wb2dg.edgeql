CREATE MIGRATION m1wb2dgjeppqex272zwvqnsdfzdvvppub4iwa5vaxu3xxigyjlruka
    ONTO m1rjlewu5fimvn4lf4xguullcbvlttuxmtxyl4yz4dmsbyw5shva7a
{
  ALTER TYPE default::Person {
      CREATE PROPERTY isAdult: std::bool;
  };
};
