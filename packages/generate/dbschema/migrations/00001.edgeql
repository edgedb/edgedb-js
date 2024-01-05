CREATE MIGRATION m1qrfvb2yoqqjcw5yw7m6r3yldcztzdigrbbjeaa3hs6fp7chtx7dq
    ONTO initial
{
  CREATE TYPE default::Comment {
      CREATE LINK parentComment: default::Comment;
      CREATE MULTI LINK replies := (.<parentComment[IS default::Comment]);
      CREATE REQUIRED PROPERTY created_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE REQUIRED PROPERTY text: std::str;
  };
  CREATE TYPE default::User {
      CREATE REQUIRED PROPERTY age: std::int32;
      CREATE REQUIRED PROPERTY name: std::str;
  };
  ALTER TYPE default::Comment {
      CREATE REQUIRED LINK author: default::User;
  };
  ALTER TYPE default::User {
      CREATE MULTI LINK comments := (.<author[IS default::Comment]);
  };
  CREATE TYPE default::Post {
      CREATE REQUIRED LINK author: default::User;
      CREATE REQUIRED PROPERTY content: std::str;
      CREATE REQUIRED PROPERTY created_at: std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE REQUIRED PROPERTY published: std::bool;
      CREATE REQUIRED PROPERTY title: std::str;
  };
  ALTER TYPE default::Comment {
      CREATE LINK parentPost: default::Post;
  };
  ALTER TYPE default::Post {
      CREATE MULTI LINK comments := (.<parentPost[IS default::Comment]);
  };
  ALTER TYPE default::User {
      CREATE MULTI LINK posts := (.<author[IS default::Post]);
  };
};
