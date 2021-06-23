import {reflection as $} from "edgedb";
console.log("asdf");

import * as e from "./generated/example";

e.default.Movie;

const {Hero} = e.default;

console.log(Hero);
console.log(Hero.__shape__);
console.log(Hero.__shape__.name);
console.log(Hero.__shape__.villains);

// const asdf = $.spec.objectType(Hero);
Hero.__ismaterialtype__;
export {};
