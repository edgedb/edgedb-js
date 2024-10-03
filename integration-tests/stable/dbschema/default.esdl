using extension pgcrypto;
using extension auth;

module default {
  type CryptoTest {
    hash_sha256: bytes;
  }

  type User {
    identity: ext::auth::Identity;

    multi movies: Movie;
    multi shows: Show;

    multi watching_list := ( 
      select .movies union .shows
      order by .index
    );
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

  abstract type Content {
    required index: int16;
    required title: str;
  }

  type Movie extending Content {
   required plot: str;
  }

  type Show extending Content {
   required seasons: int16;
  }
};
