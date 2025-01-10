import {createClient} from "edgedb";

let c = createClient({
  host: 'localhost',
  tlsSecurity: 'insecure',
});

await c.ensureConnected();

console.log('here')
console.log(await c.query('select (<default::foo>42, "aa")'))
