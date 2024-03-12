CREATE MIGRATION m1rjlewu5fimvn4lf4xguullcbvlttuxmtxyl4yz4dmsbyw5shva7a
    ONTO m13x34vijy2dlwl3x5jewnjcxb6tysyo7pr2zbbljadjdi2y5w3cja
{
  CREATE MODULE User::Profile IF NOT EXISTS;
  CREATE TYPE User::Profile::MailingAddress {
      CREATE PROPERTY city: std::str;
      CREATE PROPERTY state: std::str;
      CREATE PROPERTY street: std::str;
      CREATE PROPERTY zip: std::str;
  };
  CREATE TYPE User::Profile {
      CREATE LINK address: User::Profile::MailingAddress;
  };
};
