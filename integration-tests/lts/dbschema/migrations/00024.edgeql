CREATE MIGRATION m13x34vijy2dlwl3x5jewnjcxb6tysyo7pr2zbbljadjdi2y5w3cja
    ONTO m1tdrrz5jv7b4z7wo532wow2bdkq2oij5lkatt4vkqxfneise7j32q
{
  CREATE MODULE default::nested IF NOT EXISTS;
  CREATE TYPE User::User EXTENDING default::User;
  CREATE TYPE default::nested::Test {
      CREATE PROPERTY prop: std::str;
  };
};
