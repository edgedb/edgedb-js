import { Prisma } from '@prisma/client'
import * as runtime from '@prisma/client/runtime/library'
import { open } from 'node:fs/promises';
import * as edgedb from "edgedb"
import dotenv from "dotenv";


interface Dictionary<T> {
  [Key: string]: T;
}


dotenv.config()
const HOMEDIR = process.env.HOMEDIR
const SCALAR_MAP: Dictionary<string> = {
  'String': 'str',
  'Boolean': 'bool',
  'Int': 'int32',
  'BigInt': 'bigint',
  'Float': 'float64',
  'Decimal': 'decimal',
  'DateTime': 'cal::local_datetime',
  'Json': 'json',
  'Bytes': 'bytes',
}
const edbclient = edgedb.createClient();


function getEdbFieldName(name: string): string {
  if (name == 'id') {
    return 'original_id'
  } else {
    return name
  }
}


function getEdbFieldType(field: runtime.DMMF.Field): string {
  // Prisma scalars need to be mapped to built-ins, other types can use their
  // own names
  if (field.kind == 'scalar') {
    return SCALAR_MAP[field.type]
  } else {
    return field.type
  }
}


async function main() {
  // read the JSON dumps and insert them
  for (let model of Prisma.dmmf.datamodel.models) {
    const file = await open(`${ HOMEDIR }/dump/${ model.name }.json`, 'r')
    let properties: string[] = []

    for (let field of model.fields) {
      // we only expect properties
      if (field.kind != 'object') {
        properties.push(
          `${ getEdbFieldName(field.name) } :=
            <${ getEdbFieldType(field) }>
            data['${ field.dbName ?? field.name }']`
        )
      }
    }

    for await (let line of file.readLines()) {
      await edbclient.execute(`
        with data := to_json(<str>$line)
        insert ${ model.name } {
          ${ properties.join(',') }
        }
      `, {line: line})
    }
  }

  // update the links using the recorded properties
  for (let model of Prisma.dmmf.datamodel.models) {
    let links: string[] = []
    for (let field of model.fields.filter((f) => f.kind == 'object')) {
      // see if the have the corresponding property
      if (field.relationFromFields!.length > 0) {
        links.push(
          `${ field.name } := (
            select ${ field.type }
            filter .${ getEdbFieldName(field.relationToFields![0]) } =
              ${ model.name }.${ field.relationFromFields![0] }
          )`
        )
      }
    }

    // perform a global update to add links
    await edbclient.execute(`
      update ${ model.name }
      set {
        ${ links.join(',') }
      }
    `)
  }
}


main()
  .then(async () => {
  })
  .catch(async (e) => {
    console.error(e)
    process.exit(1)
  })