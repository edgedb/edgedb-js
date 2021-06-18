CREATE MIGRATION m1as6eltixxw3tj2nj7fkwyk3ukwp2j7ucvrwxgq6nx5qyinf6cqta
    ONTO m1iin5v3q4nj5wcfo7mu53itprsvxvvltlf7dblux5t4bfxtkcsyjq
{
  CREATE FINAL SCALAR TYPE default::Genre EXTENDING enum<Horror, Action, RomCom>;
  ALTER TYPE default::Movie {
      CREATE PROPERTY genre -> default::Genre;
      CREATE PROPERTY secret_identity -> std::str;
  };
};
