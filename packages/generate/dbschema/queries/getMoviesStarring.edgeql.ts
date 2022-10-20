import type {Client, Range, LocalDate} from "edgedb";

export async function getMoviesStarring(client: Client, args: {
  "name"?: string | null;
}): Promise<{
  "id": string;
  "title": string;
  "release_year": number;
  "characters": {
    "name": string;
    "@character_name": string | null;
  }[];
  "tuple": [number, string, bigint[]];
  "version": {
    "major": number;
    "minor": number;
    "stage": "dev" | "alpha" | "beta" | "rc" | "final";
    "stage_no": number;
    "local": string[];
  };
  "range": Range<number>;
  "local_date": LocalDate;
}[]> {
  return client.query(`select Movie {
  id,
  title,
  release_year,
  characters: {
    name,
    @character_name,
  },
  tuple := (123, 'abc', [123n]),
  version := sys::get_version(),
  range := range(123, 456),
  local_date := <cal::local_date>'2022-09-08',
} filter .characters.name = <optional str>$name;

`, args);
}