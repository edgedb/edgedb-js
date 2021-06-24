CREATE MIGRATION m1sde65gqficjkctntdorsaovhyo3aaiiqtw2fvktmotmyayebljya
    ONTO m1maaoaoiqpyt6c3kazgkq37pyeywkk2cnyhheaffxvwtmdm7hc3zq
{
  CREATE ABSTRACT LINK default::movie_character {
      CREATE PROPERTY character_name -> std::str;
  };
  ALTER TYPE default::Movie {
      ALTER LINK characters {
          EXTENDING default::movie_character LAST;
      };
  };
};
