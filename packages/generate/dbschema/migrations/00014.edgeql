CREATE MIGRATION m1rnvubcfvngzum54o2mtbpmmdhvm6t7cwco24qj2yc73y36jidt6a
    ONTO m1b62haafkhumqw6hiq7jvih32qqtrasau4i3wpscc34yhpegiooqq
{
  ALTER TYPE default::Movie {
      CREATE CONSTRAINT std::exclusive ON ((.title, .release_year));
  };
};
