CREATE MIGRATION m1ooskmhgmkiqc66xfkdhtynppvluh6nvn7zsiun4tntkmegxpigrq
    ONTO m1kdvcuojq6vgxpucribmqil4m37qs42ka2sptulit4cyhp5rin3xa
{
  CREATE TYPE default::AdminUser EXTENDING default::User {
      ALTER PROPERTY username {
          SET OWNED;
          SET REQUIRED;
          SET TYPE std::str;
          CREATE CONSTRAINT std::exclusive;
      };
  };
};
