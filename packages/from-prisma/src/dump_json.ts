import { Prisma } from '@prisma/client'
import { open } from 'node:fs/promises';
import pg from 'pg'
import Cursor from 'pg-cursor'
import dotenv from "dotenv";


dotenv.config()
const HOMEDIR = process.env.HOMEDIR
const client = new pg.Client(process.env.DATABASE_URL!.split('?')[0])


async function main() {
  // Connect to database server
  await client.connect();

  // copy all the tables
  for (let model of Prisma.dmmf.datamodel.models) {
    let file = await open(`${ HOMEDIR }/dump/${ model.name }.json`, 'w')

    let cursor = client.query(new Cursor(`
      SELECT ROW_TO_JSON(t)::text AS data FROM "${ model.dbName ?? model.name }" AS t
    `))

    let data: any[]
    do {
      data = await cursor.read(100)
      for (let row of data) {
        await file.write(row['data'] + '\n')
      }
    } while (data.length > 0)
  }
}


main()
  .then(async () => {
    await client.end()
  })
  .catch(async (e) => {
    console.error(e)
    await client.end()
    process.exit(1)
  })