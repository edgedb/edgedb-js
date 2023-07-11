select Movie {
  id,
  title,
  release_year,
  characters: {
    name,
    height,
    @character_name,
  },
  `tuple` := (123, 'abc', [123n]),
  version := sys::get_version(),
  range := range(123, 456),
  local_date := <cal::local_date>'2022-09-08',
} filter .characters.name = <optional str>$name;

