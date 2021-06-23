import * as e from "./generated/example";

const {Hero} = e.default;
console.log(Hero);
console.log(Hero.__name__);
console.log(Hero.__shape__);
console.log(Hero.__shape__.name);
console.log(Hero.__shape__.villains);
console.log(Hero.__shape__.villains.cardinality);
console.log(Hero.__shape__.villains.linkTarget.__name__);
console.log(Hero.__shape__.villains.properties);

// type asdf = TypeSet<Str, Cardinality>;

Hero.__ismaterialtype__;
export {};
