export abstract class Geometry {
  abstract hasZ: boolean;
  abstract hasM: boolean;
  abstract srid: number | null;

  abstract toWKT(indent?: number | null): string;
}

function _pointToWKT(p: Point) {
  return `${p.x} ${p.y}${p.z !== null ? ` ${p.z}` : ""}${
    p.m !== null ? ` ${p.m}` : ""
  }`;
}

function _flagsToWKT(z: boolean, m: boolean) {
  return (z || m ? " " : "") + (z ? "Z" : "") + (m ? "M" : "");
}

function _sridWKTPrefix(srid: number | null, depth: number) {
  return srid !== null && depth === 0 ? `SRID=${srid}; ` : "";
}

function _indent(indent: number | null | undefined, depth: number): string {
  if (!indent) return "";
  return "\n" + " ".repeat(indent * depth);
}

export class Point extends Geometry {
  constructor(
    public x: number,
    public y: number,
    public z: number | null = null,
    public m: number | null = null,
    public srid: number | null = null,
  ) {
    super();
  }

  get hasZ() {
    return this.z !== null;
  }

  get hasM() {
    return this.m !== null;
  }

  toWKT(
    indent?: number | null,
    truncate: number = Infinity,
    depth: number = 0,
  ): string {
    return `${_sridWKTPrefix(this.srid, depth)}POINT${_flagsToWKT(
      this.z !== null,
      this.m !== null,
    )} ${Number.isNaN(this.x) ? "EMPTY" : "(" + _pointToWKT(this) + ")"}`;
  }
}

export class MultiPoint extends Geometry {
  constructor(
    public geometries: Point[],
    public hasZ: boolean,
    public hasM: boolean,
    public srid: number | null,
  ) {
    super();
  }

  toWKT(
    indent?: number | null,
    truncate: number = Infinity,
    depth: number = 0,
  ): string {
    let wkt = `${_sridWKTPrefix(this.srid, depth)}MULTIPOINT${_flagsToWKT(
      this.hasZ,
      this.hasM,
    )} `;
    if (this.geometries.length === 0) {
      return wkt + "EMPTY";
    }
    wkt += `(`;
    let i = 0;
    while (i < this.geometries.length && wkt.length < truncate) {
      wkt +=
        _indent(indent, depth + 1) +
        "(" +
        _pointToWKT(this.geometries[i++]) +
        (i < this.geometries.length ? "), " : ")");
    }
    return wkt + _indent(indent, depth) + ")";
  }
}

function _linestringToWKT(
  points: Point[],
  indent?: number | null,
  truncate: number = Infinity,
  depth: number = 0,
): string {
  let wkt = `(`;
  let i = 0;
  while (i < points.length && wkt.length < truncate) {
    wkt +=
      _indent(indent, depth + 1) +
      _pointToWKT(points[i++]) +
      (i < points.length ? ", " : "");
  }
  return wkt + _indent(indent, depth) + ")";
}

export class LineString extends Geometry {
  constructor(
    public points: Point[],
    public hasZ: boolean,
    public hasM: boolean,
    public srid: number | null,
  ) {
    super();
  }

  protected static _wktName = "LINESTRING";

  toWKT(
    indent?: number | null,
    truncate: number = Infinity,
    depth: number = 0,
  ): string {
    let wkt = `${_sridWKTPrefix(this.srid, depth)}${
      (this.constructor as typeof LineString)._wktName
    }${_flagsToWKT(this.hasZ, this.hasM)} `;
    if (this.points.length === 0) {
      return wkt + "EMPTY";
    }
    return (
      wkt + _linestringToWKT(this.points, indent, truncate - wkt.length, depth)
    );
  }
}

export class CircularString extends LineString {
  protected static _wktName = "CIRCULARSTRING";
}

function _multilinestringToWKT(
  lineStrings: LineString[],
  indent?: number | null,
  truncate: number = Infinity,
  depth: number = 0,
): string {
  let wkt = `(`;
  let i = 0;
  while (i < lineStrings.length && wkt.length < truncate) {
    wkt +=
      _indent(indent, depth + 1) +
      _linestringToWKT(
        lineStrings[i++].points,
        indent,
        truncate - wkt.length,
        depth + 1,
      ) +
      (i < lineStrings.length ? ", " : "");
  }
  return wkt + _indent(indent, depth) + ")";
}

export class MultiLineString extends Geometry {
  constructor(
    public geometries: LineString[],
    public hasZ: boolean,
    public hasM: boolean,
    public srid: number | null,
  ) {
    super();
  }

  toWKT(
    indent?: number | null,
    truncate: number = Infinity,
    depth: number = 0,
  ): string {
    let wkt = `${_sridWKTPrefix(this.srid, depth)}MULTILINESTRING${_flagsToWKT(
      this.hasZ,
      this.hasM,
    )} `;
    if (this.geometries.length === 0) {
      return wkt + "EMPTY";
    }
    return (
      wkt +
      _multilinestringToWKT(
        this.geometries,
        indent,
        truncate - wkt.length,
        depth,
      )
    );
  }
}

export class CompoundCurve extends Geometry {
  constructor(
    public geometries: (LineString | CircularString)[],
    public hasZ: boolean,
    public hasM: boolean,
    public srid: number | null,
  ) {
    super();
  }

  toWKT(
    indent?: number | null,
    truncate: number = Infinity,
    depth: number = 0,
  ): string {
    let wkt = `${_sridWKTPrefix(this.srid, depth)}COMPOUNDCURVE${_flagsToWKT(
      this.hasZ,
      this.hasM,
    )} `;
    if (this.geometries.length === 0) {
      return wkt + "EMPTY";
    }
    wkt += "(";
    let i = 0;
    while (i < this.geometries.length && wkt.length < truncate) {
      wkt +=
        _indent(indent, depth + 1) +
        (this.geometries[i] instanceof CircularString
          ? "CIRCULARSTRING "
          : "LINESTRING ") +
        _linestringToWKT(
          this.geometries[i++].points,
          indent,
          truncate - wkt.length,
          depth + 1,
        ) +
        (i < this.geometries.length ? ", " : "");
    }
    return wkt + _indent(indent, depth) + ")";
  }
}

export class MultiCurve extends Geometry {
  constructor(
    public geometries: (LineString | CircularString | CompoundCurve)[],
    public hasZ: boolean,
    public hasM: boolean,
    public srid: number | null,
  ) {
    super();
  }

  toWKT(
    indent?: number | null,
    truncate: number = Infinity,
    depth: number = 0,
  ): string {
    let wkt = `${_sridWKTPrefix(this.srid, depth)}MULTICURVE${_flagsToWKT(
      this.hasZ,
      this.hasM,
    )} `;
    if (this.geometries.length === 0) {
      return wkt + "EMPTY";
    }
    wkt += `(`;
    let i = 0;
    while (i < this.geometries.length && wkt.length < truncate) {
      wkt +=
        _indent(indent, depth + 1) +
        this.geometries[i++].toWKT(indent, truncate - wkt.length, depth + 1) +
        (i < this.geometries.length ? ", " : "");
    }
    return wkt + _indent(indent, depth) + ")";
  }
}

export class Polygon extends Geometry {
  constructor(
    public rings: LineString[],
    public hasZ: boolean,
    public hasM: boolean,
    public srid: number | null,
  ) {
    super();
  }

  protected static _wktName = "POLYGON";

  toWKT(
    indent?: number | null,
    truncate: number = Infinity,
    depth: number = 0,
  ): string {
    let wkt = `${_sridWKTPrefix(this.srid, depth)}${
      (this.constructor as typeof Polygon)._wktName
    }${_flagsToWKT(this.hasZ, this.hasM)} `;
    if (this.rings.length === 0) {
      return wkt + "EMPTY";
    }
    return (
      wkt +
      _multilinestringToWKT(this.rings, indent, truncate - wkt.length, depth)
    );
  }
}

export class Triangle extends Polygon {
  protected static _wktName = "TRIANGLE";
}

export class CurvePolygon extends Geometry {
  constructor(
    public geometries: (LineString | CircularString | CompoundCurve)[],
    public hasZ: boolean,
    public hasM: boolean,
    public srid: number | null,
  ) {
    super();
  }

  toWKT(
    indent?: number | null,
    truncate: number = Infinity,
    depth: number = 0,
  ): string {
    let wkt = `${_sridWKTPrefix(this.srid, depth)}CURVEPOLYGON${_flagsToWKT(
      this.hasZ,
      this.hasM,
    )} `;
    if (this.geometries.length === 0) {
      return wkt + "EMPTY";
    }
    wkt += `(`;
    let i = 0;
    while (i < this.geometries.length && wkt.length < truncate) {
      wkt +=
        _indent(indent, depth + 1) +
        this.geometries[i++].toWKT(indent, truncate - wkt.length, depth + 1) +
        (i < this.geometries.length ? ", " : "");
    }
    return wkt + _indent(indent, depth) + ")";
  }
}

export class MultiPolygon extends Geometry {
  constructor(
    public geometries: Polygon[],
    public hasZ: boolean,
    public hasM: boolean,
    public srid: number | null,
  ) {
    super();
  }

  protected static _wktName = "MULTIPOLYGON";

  toWKT(
    indent?: number | null,
    truncate: number = Infinity,
    depth: number = 0,
  ): string {
    let wkt = `${_sridWKTPrefix(this.srid, depth)}${
      (this.constructor as typeof MultiPolygon)._wktName
    }${_flagsToWKT(this.hasZ, this.hasM)} `;
    if (this.geometries.length === 0) {
      return wkt + "EMPTY";
    }
    wkt += `(`;
    let i = 0;
    while (i < this.geometries.length && wkt.length < truncate) {
      wkt +=
        _indent(indent, depth + 1) +
        _multilinestringToWKT(
          this.geometries[i++].rings,
          indent,
          truncate - wkt.length,
          depth + 1,
        ) +
        (i < this.geometries.length ? ", " : "");
    }
    return wkt + _indent(indent, depth) + ")";
  }
}

export class PolyhedralSurface extends MultiPolygon {
  protected static _wktName = "POLYHEDRALSURFACE";
}

export class TriangulatedIrregularNetwork extends MultiPolygon {
  protected static _wktName = "TIN";
}

export class MultiSurface extends Geometry {
  constructor(
    public geometries: (Polygon | CurvePolygon)[],
    public hasZ: boolean,
    public hasM: boolean,
    public srid: number | null,
  ) {
    super();
  }

  toWKT(
    indent?: number | null,
    truncate: number = Infinity,
    depth: number = 0,
  ): string {
    let wkt = `${_sridWKTPrefix(this.srid, depth)}MULTISURFACE${_flagsToWKT(
      this.hasZ,
      this.hasM,
    )} `;
    if (this.geometries.length === 0) {
      return wkt + "EMPTY";
    }
    wkt += `(`;
    let i = 0;
    while (i < this.geometries.length && wkt.length < truncate) {
      wkt +=
        _indent(indent, depth + 1) +
        this.geometries[i++].toWKT(indent, truncate - wkt.length, depth + 1) +
        (i < this.geometries.length ? ", " : "");
    }
    return wkt + _indent(indent, depth) + ")";
  }
}

export type AnyGeometry =
  | Point
  | LineString
  | CircularString
  | Polygon
  | Triangle
  | MultiPoint
  | MultiLineString
  | MultiPolygon
  | TriangulatedIrregularNetwork
  | PolyhedralSurface
  | GeometryCollection
  | CompoundCurve
  | MultiCurve
  | CurvePolygon
  | MultiSurface;

export class GeometryCollection extends Geometry {
  constructor(
    public geometries: AnyGeometry[],
    public hasZ: boolean,
    public hasM: boolean,
    public srid: number | null,
  ) {
    super();
  }

  toWKT(
    indent?: number | null,
    truncate: number = Infinity,
    depth: number = 0,
  ): string {
    let wkt = `${_sridWKTPrefix(
      this.srid,
      depth,
    )}GEOMETRYCOLLECTION${_flagsToWKT(this.hasZ, this.hasM)} `;
    if (this.geometries.length === 0) {
      return wkt + "EMPTY";
    }
    wkt += `(`;
    let i = 0;
    while (i < this.geometries.length && wkt.length < truncate) {
      wkt +=
        _indent(indent, depth + 1) +
        this.geometries[i++].toWKT(indent, truncate - wkt.length, depth + 1) +
        (i < this.geometries.length ? ", " : "");
    }
    return wkt + _indent(indent, depth) + ")";
  }
}

export class Box2D {
  constructor(
    public min: [number, number],
    public max: [number, number],
  ) {}

  toString() {
    return `BOX(${this.min[0]} ${this.min[1]}, ${this.max[0]} ${this.max[1]})`;
  }
}

export class Box3D {
  constructor(
    public min: [number, number, number],
    public max: [number, number, number],
  ) {}

  toString() {
    return `BOX3D(${this.min[0]} ${this.min[1]} ${this.min[2]}, ${this.max[0]} ${this.max[1]} ${this.max[2]})`;
  }
}
