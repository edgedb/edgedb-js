CREATE MIGRATION m1nsxvycfjoyjrxdeejwuuovtufkpjn3vxqg3hsxfxrvwcicxtquya
    ONTO initial
{
  CREATE EXTENSION pgcrypto VERSION '1.3';
  CREATE EXTENSION auth VERSION '1.0';

  CREATE TYPE default::User {
      CREATE REQUIRED LINK identity: ext::auth::Identity;
      CREATE REQUIRED PROPERTY name: std::str;
  };

  CREATE GLOBAL default::current_user := (std::assert_single((SELECT
      default::User {
          id,
          name
      }
  FILTER
      (.identity = GLOBAL ext::auth::ClientTokenIdentity)
  )));

  CREATE TYPE default::BlogPost {
      CREATE REQUIRED LINK author: default::User {
          SET default := (GLOBAL default::current_user);
      };
      CREATE ACCESS POLICY author_has_full_access
          ALLOW ALL USING ((.author ?= GLOBAL default::current_user));
      CREATE ACCESS POLICY others_read_only
          ALLOW SELECT ;
      CREATE PROPERTY content: std::str {
          SET default := 'My super blog post.';
      };
      CREATE PROPERTY description: std::str {
          SET default := 'My blog post description.';
      };
      CREATE PROPERTY title: std::str {
          SET default := 'My blog super blog post title.';
      };
  };

  ALTER TYPE default::User {
      CREATE MULTI LINK posts: default::BlogPost {
          ON SOURCE DELETE DELETE TARGET;
      };
  };
};
