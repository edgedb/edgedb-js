using extension auth;

module default {
  type Todo {
    required link owner: ext::auth::Identity {
      default := assert_single(global ext::auth::ClientTokenIdentity);
    };

    required content: str;

    required completed: bool;
  }
}
