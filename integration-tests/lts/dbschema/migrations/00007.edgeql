CREATE MIGRATION m163zjk7tidrkupp7i75krcnyyi26aboiyk6zq7mdaoijdkydijyha
    ONTO m13m5xkrznccqnvocth4njrqz2rnipe5fhlrermlo56nvyp6kgrtuq
{
  ALTER TYPE default::User {
      ALTER LINK favourite_movie {
          RENAME TO favourite_movies;
      };
  };
  ALTER TYPE default::User {
      ALTER LINK favourite_movies {
          SET MULTI;
      };
  };
};
