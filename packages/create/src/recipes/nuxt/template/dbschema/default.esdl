using extension auth;

module default {
  global current_user := (
    assert_single((
      select User { id, name }
      filter .identity = global ext::auth::ClientTokenIdentity
    ))
  );

  type User {
    required name: str;
    required identity: ext::auth::Identity;
    multi link posts -> BlogPost {
      on source delete delete target;
    }
  }

  type BlogPost {
    property content: str {
      default := 'My super blog post.';
    };
    property description: str {
      default := 'My blog post description.';
    };
    property title: str {
      default := 'My blog super blog post title.';
    };
    required author: User {
      default := global current_user;
    };
    access policy author_has_full_access
      allow all
      using (.author ?= global current_user);
    access policy others_read_only
      allow select;
  }
}
