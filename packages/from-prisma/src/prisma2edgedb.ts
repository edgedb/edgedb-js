import { Prisma } from '@prisma/client'
import * as runtime from '@prisma/client/runtime/library'
import { open, writeFile } from 'node:fs/promises';
import pg from 'pg'
import Cursor from 'pg-cursor'
import * as edgedb from "edgedb"


interface Dictionary<T> {
  [Key: string]: T;
}


const HOMEDIR = '/home/victor/dev/social_prisma'
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
const client = new pg.Client(
  'postgresql://victor:localvic@localhost:5432/social')
const edbclient = edgedb.createClient();


function indent(text: string, count: number = 1): string {
  return text.replace(/^/gm, '  '.repeat(count))
}


function renderType(model: runtime.DMMF.Model, ver: string): string {
  // analyze the fields and skip any scalar fields that are used in
  // relationFromFields
  let obj_fields = model.fields.filter((f) => f.kind == 'object')
  let rel_fields: Dictionary<boolean> = {}

  obj_fields.forEach((f) => {
    if (f.relationFromFields !== undefined) {
      rel_fields[f.relationFromFields[0]] = true
    }
  })

  let fields: runtime.DMMF.Field[]
  if (ver == 'final') {
    fields = model.fields.filter((f) => rel_fields[f.name] !== true)
  } else {
    fields = model.fields
  }

  let sdl_fields: string[] = []
  let snippet: string
  for (let field of fields) {
    snippet = renderField(field, ver)
    if (snippet.length > 0) {
      sdl_fields.push(renderField(field, ver))
    }
  }

  return `\
  type ${ model.name } {
${ indent(sdl_fields.join('\n'), 2) }
  }\n`
}


function renderField(field: runtime.DMMF.Field, ver: string): string {
  let sdl = ''

  if (field.kind == 'object' && field.relationFromFields!.length == 0) {
    // FIXME: this is equivalent to a backlink, skip for now
    return ''
  }

  if (ver == 'final' && field.isRequired && !field.isList) {
    // only final schema has required fields
    sdl += 'required '
  }
  if (field.isList) {
    sdl += 'multi '
  }
  if (field.name == 'id') {
    sdl += 'original_id: '
  } else {
    sdl += `${ field.name }: `
  }
  sdl += `${ SCALAR_MAP[field.type] ?? field.type }`

  if (field.isId || field.isUnique) {
    sdl += `{
  constraint exclusive;
}`
  } else {
    sdl += ';'
  }

  return sdl
}


function renderSDL(ver: string) {
  let sdl: string = ''

  Prisma.dmmf.datamodel.models.forEach((model) => {
    sdl += renderType(model, ver)
  })

  sdl = `\
module default {
${ sdl }
}
`
  return sdl
}


async function writeSchemas() {
  await writeFile(`${ HOMEDIR }/esdl/init.esdl`, renderSDL('init'))
  await writeFile(`${ HOMEDIR }/esdl/final.esdl`, renderSDL('final'))
}


async function dumpAsJSON() {
  // Connect to database server
  await client.connect();

  // copy all the tables
  for (let model of Prisma.dmmf.datamodel.models) {
    let file = await open(`${ HOMEDIR }/dump/${ model.name }.json`, 'w')

    let cursor = client.query(new Cursor(`
      SELECT ROW_TO_JSON(t)::text AS data FROM "${ model.name }" AS t
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


async function populateEdgeDB() {
  // read the JSON dumps and insert them
  for (let model of Prisma.dmmf.datamodel.models) {
    const file = await open(`${ HOMEDIR }/dump/${ model.name }.json`, 'r')
    let properties: string[] = []

    for (let field of model.fields) {
      // we only expect properties
      if (field.kind != 'object') {
        properties.push(
          `${ field.isId ? 'original_id' : field.name } :=
            <${ SCALAR_MAP[field.type] }>data['${ field.name }']`
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
            filter .original_id =
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
