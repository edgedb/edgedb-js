import { Prisma } from '@prisma/client'
import * as runtime from '@prisma/client/runtime/library'
import { writeFile, open } from 'node:fs/promises'
import pg from 'pg'
import Cursor from 'pg-cursor'
import dotenv from 'dotenv'
import * as edgedb from 'edgedb'

import { Dictionary, SCALAR_MAP } from './utils'


dotenv.config()
const client = new pg.Client(process.env.DATABASE_URL!.split('?')[0])
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

  if (field.isRequired && !field.isList
      && (ver == 'final' || field.kind != 'object')) {
    // only final schema has required links
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


function renderEnum(enumtype: runtime.DMMF.DatamodelEnum, ver: string): string {
  const values = enumtype.values.map((val) => val.dbName ?? val.name)
  return `\
  scalar type ${ enumtype.name }
    extending enum<${ values.join(', ') }>;
`
}


function renderSDL(ver: string): string {
  let sdl: string = ''

  Prisma.dmmf.datamodel.enums.forEach((enumtype) => {
    sdl += renderEnum(enumtype, ver)
  })

  sdl += '\n'

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


export async function writeSchema(esdldir: string) {
  await writeFile(`${ esdldir }/init.esdl`, renderSDL('init'))
  await writeFile(`${ esdldir }/final.esdl`, renderSDL('final'))
}


export function wrappedWriteSchema(esdldir: string) {
  writeSchema(esdldir)
    .then(async () => {
    })
    .catch(async (e) => {
      console.error(e)
      process.exit(1)
    })
}


export async function dumpJSON(jsondir: string) {
  // Connect to database server
  await client.connect()

  // copy all the tables
  for (let model of Prisma.dmmf.datamodel.models) {
    let file = await open(`${ jsondir }/${ model.name }.json`, 'w')

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

  await client.end()
}


export function wrappedDumpJSON(jsondir: string) {
  dumpJSON(jsondir)
    .then(async () => {
      await client.end()
    })
    .catch(async (e) => {
      console.error(e)
      await client.end()
      process.exit(1)
    })
}


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


export async function migrate(jsondir: string) {
  // read the JSON dumps and insert them
  for (let model of Prisma.dmmf.datamodel.models) {
    const file = await open(`${ jsondir }/${ model.name }.json`, 'r')
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
