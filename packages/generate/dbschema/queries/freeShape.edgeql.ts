import type {Client} from "edgedb";

export async function freeShape(client: Client, args: {
  "data": string;
}): Promise<{
  "name": string;
  "points": bigint;
  "data": string;
  "arg": [(string), ...(string)[]];
}> {
  return client.queryRequiredSingle(`select {
  name := "arg",
  points := 1234n,
  data := <str>$data,
  required multi arg := {'asdf'}
};
`, args);
}