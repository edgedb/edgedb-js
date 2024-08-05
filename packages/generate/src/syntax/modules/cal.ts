import type { LocalDate, LocalDateTime } from "edgedb";
import type { ScalarType } from "../typesystem.js";

export type $local_date = ScalarType<"cal::local_date", LocalDate>;
export type $local_datetime = ScalarType<"cal::local_datetime", LocalDateTime>;
