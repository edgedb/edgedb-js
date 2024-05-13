select {
  name := "arg",
  points := 1234n,
  data := <str>$data,
  required multi arg := {'asdf'},
  enums := [Genre.Horror, Genre.Action],
  regexp := re_match('\\s*(.*)?\\s+BEEP', "     find me BEEP")[0]
};
