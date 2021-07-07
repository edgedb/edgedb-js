// tslint:disable:no-console
import * as e from "./generated/example";

const asdf = e.set(e.int16(15), e.int16(15));
const cast1 = e.cast(e.$Int32, asdf);
console.log(cast1);

const cast2 = e.cast(e.$Float32, e.float64(3.14));
console.log(cast2);

const castObject = e.cast(e.$Float32, e.float64(3.14));
console.log(cast2);
