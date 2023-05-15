CREATE MIGRATION m1lfiatnywnhkfhjojqxk5iaih2qj5nvaxv7yupc4bitalnvfr7cca
    ONTO m1svs6bsex5nmq3fgcyr4y3ahgclgdywezxihwjbveft22427x6uya
{
  ALTER TYPE default::Person {
      CREATE PROPERTY height -> std::decimal;
  };
};
