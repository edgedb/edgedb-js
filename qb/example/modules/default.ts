import {reflection as $} from "edgedb";
import {spec as __spec__} from "../__spec__";
import type * as __types__ from "../__types__/default";

export const Person = $.objectType<__types__.Person>(
  __spec__,
  "default::Person",
);

export const Hero = $.objectType<__types__.Hero>(
  __spec__,
  "default::Hero",
);

export const Movie = $.objectType<__types__.Movie>(
  __spec__,
  "default::Movie",
);

export const Villain = $.objectType<__types__.Villain>(
  __spec__,
  "default::Villain",
);
