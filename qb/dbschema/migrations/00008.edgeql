CREATE MIGRATION m135rscrsthtlntxhacevxtvytgwf2vjyqfwvnwod5jihwpzp2zgyq
    ONTO m163zjk7tidrkupp7i75krcnyyi26aboiyk6zq7mdaoijdkydijyha
{
  ALTER TYPE default::Bag {
      CREATE PROPERTY jsonField -> std::json;
  };
};
