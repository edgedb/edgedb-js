using extension auth;

module default {
  type WithMultiRange {
    required ranges: multirange<std::int32>;
  };
}
