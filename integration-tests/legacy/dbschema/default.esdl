module default {
  type User {
    required property name -> str;
    multi link friends -> User;
  }
}
