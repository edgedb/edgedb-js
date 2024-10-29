export class SparseVector {
  public indexes: Uint32Array;
  public values: Float32Array;

  [index: number]: number;

  constructor(length: number, map: Record<number, number>);
  constructor(length: number, indexes: Uint32Array, values: Float32Array);
  constructor(
    public length: number,
    indexesOrMap: Uint32Array | Record<number, number>,
    values?: Float32Array,
  ) {
    if (indexesOrMap instanceof Uint32Array) {
      if (indexesOrMap.length !== values?.length) {
        throw new Error(
          "indexes array must be the same length as the data array",
        );
      }
      if (indexesOrMap.length > length) {
        throw new Error(
          "length of data cannot be larger than length of sparse vector",
        );
      }
      this.values = values;
      this.indexes = indexesOrMap;
    } else {
      const entries = Object.entries(indexesOrMap);
      if (entries.length > length) {
        throw new Error(
          "length of data cannot be larger than length of sparse vector",
        );
      }
      this.indexes = new Uint32Array(entries.length);
      this.values = new Float32Array(entries.length);
      for (let i = 0; i < entries.length; i++) {
        const index = parseInt(entries[i][0], 10);
        const val = entries[i][1];
        if (Number.isNaN(index)) {
          throw new Error(`key ${entries[i][0]} in data map is not an integer`);
        }
        if (index < 0 || index >= length) {
          throw new Error(
            `index ${index} is out of range of sparse vector length`,
          );
        }
        this.indexes[i] = index;
        if (typeof val !== "number") {
          throw new Error(
            `expected value at index ${index} to be number, got ${typeof val} ${val}`,
          );
        }
        if (val === 0) {
          throw new Error("elements in sparse vector cannot be 0");
        }
        this.values[i] = val;
      }
    }

    return new Proxy(this, {
      get(target, p) {
        const index = typeof p === "string" ? parseInt(p, 10) : NaN;
        if (!Number.isNaN(index)) {
          if (index < 0 || index >= target.length) return undefined;
          const dataIndex = target.indexes.indexOf(index);
          return dataIndex === -1 ? 0 : target.values[dataIndex];
        }
        return (target as any)[p];
      },
    });
  }
}
