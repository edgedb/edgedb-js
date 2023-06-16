select {
  name := "arg",
  points := 1234n,
  data := <str>$data,
  required multi arg := {'asdf'},
  enums := [Genre.Horror, Genre.Action],
  embedding := <embedding>[1, 2, 3],
};
