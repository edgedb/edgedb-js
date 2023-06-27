CREATE MIGRATION m1kvj4ewi2ueqdw3xozy2wauilf67fqconz35u55osxwd2ik6ybhrq
    ONTO m135rscrsthtlntxhacevxtvytgwf2vjyqfwvnwod5jihwpzp2zgyq
{
  CREATE MODULE extra IF NOT EXISTS;
  CREATE GLOBAL default::arr_global -> array<std::str>;
  CREATE GLOBAL default::named_tuple_global -> tuple<name: std::str, age: std::int64>;
  CREATE GLOBAL default::num_global -> std::int64;
  CREATE GLOBAL default::str_global -> std::str;
  CREATE GLOBAL default::str_global_with_default -> std::str {
      SET default := 'hi mom';
  };
  CREATE MULTI GLOBAL default::str_multi := ({'hi', 'mom'});
  CREATE REQUIRED GLOBAL default::str_required -> std::str {
      SET default := 'hi mom';
  };
  CREATE REQUIRED MULTI GLOBAL default::str_required_multi := ({'hi', 'mom'});
  CREATE GLOBAL default::tuple_global -> tuple<std::str, std::int64>;
  CREATE GLOBAL default::uuid_global -> std::uuid;
  CREATE GLOBAL extra::user_id -> std::uuid;
};
