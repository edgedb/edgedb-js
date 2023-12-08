interface Dictionary<T> {
    [Key: string]: T;
}
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


export {SCALAR_MAP, Dictionary}