CREATE MIGRATION m1tdrrz5jv7b4z7wo532wow2bdkq2oij5lkatt4vkqxfneise7j32q
    ONTO m1rn5yebzwvfjxj5hvugtrug3o7jzhncvdhobjedw24wsni6v3l6ia
{
  CREATE MODULE User IF NOT EXISTS;
  CREATE SCALAR TYPE User::Status EXTENDING enum<Active, Disabled>;
};
