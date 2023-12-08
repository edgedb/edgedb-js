import { Prisma } from '@prisma/client'
import * as runtime from '@prisma/client/runtime/library'
import { writeFile } from 'node:fs/promises';
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


async function main() {
  await writeFile(`${ HOMEDIR }/esdl/init.esdl`, renderSDL('init'))
  await writeFile(`${ HOMEDIR }/esdl/final.esdl`, renderSDL('final'))
}


main()
  .then(async () => {
  })
  .catch(async (e) => {
    console.error(e)
    process.exit(1)
  })