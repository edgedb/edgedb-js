// tslint:disable:no-console
import {setupTests} from "./test/setupTeardown";
import e from "./dbschema/edgeql-js";
import {createClient} from "edgedb";
import {int64} from "./dbschema/edgeql-js/modules/std";
import { A } from "./dbschema/edgeql-js/modules/default";

const client = createClient();

async function run() {
  // const {client} = await setupTests();

  // e.op(e.int32(123), 'in', 456);

  // e.int32(123).in(e.int64(456));

  // const x = e.int64(123).minus().plus(456).eq(579).in();

  // e.Movie.in()

  // console.log(x.toEdgeQL());
  // // .plus(e.int64(456))
  // // ["="](e.set(e.int32(345), e.int16(123)));

  // console.log(e.str("abc").concat("def").toEdgeQL());

  console.log(
    e
      .select(e.Movie, () => ({
        limit: e.int16(123)
      }))
      .toEdgeQL()
  );
}

run();

// edgeql
a if cond_a else
b if cond_b else c

// current e.op
e.op(a, 'if', cond_a, 'else', e.op(b, 'if', cond_b, 'else', c))

// method
a.if_else(cond_a, b.if_else(cond_b, c))

// split method
a.if(cond_a).else(b).if(cond_b).else(c)

// function
e.if_else(a, cond_a, e.if_else(b, cond_b, c))
