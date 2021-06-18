CREATE MIGRATION m1jabbb4ieaq4riptb3iihzt76h4gwqdvxqli4zlx5p7abi2vme55a
    ONTO m1as6eltixxw3tj2nj7fkwyk3ukwp2j7ucvrwxgq6nx5qyinf6cqta
{
  ALTER TYPE default::Movie {
      CREATE PROPERTY rating -> std::float64;
  };
};
