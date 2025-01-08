import { Client, ConnectOptions } from "gel";
import * as testbase from "../../driver/test/testbase";

export const getClient = testbase.getClient as unknown as (
  opts?: ConnectOptions,
) => Client;
