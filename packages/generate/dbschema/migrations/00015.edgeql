CREATE MIGRATION m1gn7rh2t5cv2fgq46rj5mmtzuko7lm4t6ukayun24wbu5ijazlwoq
    ONTO m1rnvubcfvngzum54o2mtbpmmdhvm6t7cwco24qj2yc73y36jidt6a
{
  ALTER TYPE default::Profile {
      CREATE PROPERTY a -> std::str;
      CREATE PROPERTY b -> std::str;
      CREATE PROPERTY c -> std::str;
      CREATE CONSTRAINT std::exclusive ON ((.a, .b, .c));
      CREATE CONSTRAINT std::exclusive ON ((.plot_summary, .slug));
  };
};
