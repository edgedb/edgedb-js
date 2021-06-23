import * as e from "./generated/example";
import {reflection as $} from "edgedb";

e.default.Movie;

const {Hero} = e.default;

console.log(Hero);
console.log(Hero.__shape__);
console.log(Hero.__shape__.name);
console.log(Hero.__shape__.villains);

Hero.__ismaterialtype__;
export {};
