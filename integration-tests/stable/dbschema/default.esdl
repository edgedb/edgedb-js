using extension pgcrypto;
using extension auth;
using extension ai;

module default {
  type CryptoTest {
    hash_sha256: bytes;
  }

  type User {
    identity: ext::auth::Identity;
  }

  type Post {
    required text: str;

    index fts::index on (
      fts::with_options(
        .text,
        language := fts::Language.eng
      )
    );
  }

  type WithMultiRange {
    required ranges: multirange<std::int32>;
  }
};
