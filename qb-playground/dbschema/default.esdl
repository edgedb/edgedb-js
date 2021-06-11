module default {
    abstract type Person {
      required property name -> str {
        constraint exclusive;
      };
    }

    type Villain extending Person {
      link nemesis -> Hero;
    }

    type Hero extending Person {
      property secret_identity -> str;
      property number_of_movies -> int64;
      multi link villains := .<nemesis[IS Villain];
    }

    type Movie {
      required property title -> str;
      multi link characters -> Person;
  }
}
