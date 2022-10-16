CREATE MIGRATION m1f64d3rv37gimlrzqnmbcw3wehfrigsm3dvqohdxbv6wrz4gkvrqq
    ONTO m1gn7rh2t5cv2fgq46rj5mmtzuko7lm4t6ukayun24wbu5ijazlwoq
{
  ALTER TYPE default::Bag {
      CREATE PROPERTY arrTupleField -> array<tuple<std::str, std::int64>>;
  };
};
