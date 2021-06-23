import * as e from "./generated/example";
import {reflection as $} from "edgedb";

e.default.Movie;

const {Hero} = e.default;

console.log(Hero);
console.log(Hero.__shape);
console.log(Hero.__shape.name);
console.log(Hero.__shape.villains);

export {};
