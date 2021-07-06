// tslint:disable:no-console
import * as e from "./generated/example";

const asdf = e.set(e.int16(15), e.int16(15));
type type = e.$infer<typeof asdf>;
