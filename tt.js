"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
var index_node_1 = require("./dist/src/index.node");
var CodeBuilder = /** @class */ (function () {
    function CodeBuilder() {
        this.buf = [];
        this.indent = 0;
    }
    CodeBuilder.prototype.nl = function () {
        this.buf.push("");
    };
    CodeBuilder.prototype.indented = function (nested) {
        this.indent++;
        try {
            nested();
        }
        finally {
            this.indent--;
        }
    };
    CodeBuilder.prototype.writeln = function (line) {
        this.buf.push("  ".repeat(this.indent) + line);
    };
    CodeBuilder.prototype.render = function () {
        return this.buf.join("\n") + "\n";
    };
    return CodeBuilder;
}());
var FileBuilder = /** @class */ (function () {
    function FileBuilder() {
        this._head = new CodeBuilder();
        this._body = new CodeBuilder();
    }
    Object.defineProperty(FileBuilder.prototype, "head", {
        get: function () {
            return this._head;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FileBuilder.prototype, "body", {
        get: function () {
            return this._body;
        },
        enumerable: false,
        configurable: true
    });
    FileBuilder.prototype.render = function () {
        return this._head.render() + "\n" + this._body.render();
    };
    return FileBuilder;
}());
var DirBuilder = /** @class */ (function () {
    function DirBuilder() {
        this._map = new Map();
    }
    DirBuilder.prototype.getPath = function (path) {
        if (!this._map.has(path)) {
            this._map.set(path, new FileBuilder());
        }
        return this._map.get(path);
    };
    DirBuilder.prototype.debug = function () {
        var e_1, _a;
        var buf = [];
        try {
            for (var _b = __values(this._map.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var _d = __read(_c.value, 2), path = _d[0], builder = _d[1];
                buf.push(">>> " + path + "\n");
                buf.push(builder.render());
                buf.push("\n");
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return buf.join("\n");
    };
    return DirBuilder;
}());
var scalarMap = new Map([
    ["std::bool", "boolean"],
    ["std::str", "string"],
    ["std::int16", "number"],
    ["std::int32", "number"],
    ["std::int64", "number"],
    ["std::float32", "number"],
    ["std::float64", "number"],
    ["std::bigint", "BigInt"],
    ["std::uuid", "edgedb.UUID"],
    ["std::bytes", "Buffer"],
    ["std::datetime", "Date"],
    ["std::duration", "edgedb.Duration"],
    ["cal::local_datetime", "edgedb.LocalDateTime"],
    ["std::local_date", "edgedb.LocalDate"],
    ["std::local_time", "edgedb.LocalTime"],
    ["std::json", "string"],
]);
function fetchTypes(con) {
    return __awaiter(this, void 0, void 0, function () {
        var types, graph, adj, types_1, types_1_1, type, types_2, types_2_1, type, _a, _b, base, visiting, visited, sorted, visit, types_3, types_3_1, type;
        var e_2, _c, e_3, _d, e_4, _e, e_5, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0: return [4 /*yield*/, con.query("\n    WITH\n      MODULE schema,\n\n      material_scalars := (\n        SELECT ScalarType\n        FILTER\n          (.name LIKE 'std::%' OR .name LIKE 'cal::%')\n          AND NOT .is_abstract\n      )\n\n    SELECT Type {\n      id,\n      name,\n      is_abstract,\n\n      kind := 'object' IF Type IS ObjectType ELSE\n              'scalar' IF Type IS ScalarType ELSE\n              'array' IF Type IS Array ELSE\n              'tuple' IF Type IS Tuple ELSE\n              'unknown',\n\n      [IS ScalarType].enum_values,\n\n      single material_id := (\n        SELECT x := Type[IS ScalarType].ancestors\n        FILTER x IN material_scalars\n        LIMIT 1\n      ).id,\n\n      [IS InheritingObject].bases: {\n        id\n      } ORDER BY @index ASC,\n\n      [IS ObjectType].union_of,\n      [IS ObjectType].intersection_of,\n      [IS ObjectType].pointers: {\n        cardinality,\n        required,\n        name,\n        expr,\n\n        target_id := .target.id,\n\n        kind := 'link' IF .__type__.name = 'schema::Link' ELSE 'property',\n\n        [IS Link].pointers: {\n          name,\n          target_id := .target.id\n        } FILTER @is_owned,\n      } FILTER @is_owned,\n\n      array_element_id := [IS Array].element_type.id,\n\n      tuple_elements := (SELECT [IS Tuple].element_types {\n        target_id := .type.id,\n        name\n      } ORDER BY @index ASC),\n    }\n    ORDER BY .name;\n  ")];
                case 1:
                    types = _g.sent();
                    graph = new Map();
                    adj = new Map();
                    try {
                        for (types_1 = __values(types), types_1_1 = types_1.next(); !types_1_1.done; types_1_1 = types_1.next()) {
                            type = types_1_1.value;
                            graph.set(type.id, type);
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (types_1_1 && !types_1_1.done && (_c = types_1.return)) _c.call(types_1);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                    try {
                        for (types_2 = __values(types), types_2_1 = types_2.next(); !types_2_1.done; types_2_1 = types_2.next()) {
                            type = types_2_1.value;
                            if (type.kind !== "object" && type.kind !== "scalar") {
                                continue;
                            }
                            try {
                                for (_a = (e_4 = void 0, __values(type.bases)), _b = _a.next(); !_b.done; _b = _a.next()) {
                                    base = _b.value.id;
                                    if (graph.has(base)) {
                                        if (!adj.has(type.id)) {
                                            adj.set(type.id, new Set());
                                        }
                                        adj.get(type.id).add(base);
                                    }
                                    else {
                                        throw new Error("reference to an unknown object type: " + base);
                                    }
                                }
                            }
                            catch (e_4_1) { e_4 = { error: e_4_1 }; }
                            finally {
                                try {
                                    if (_b && !_b.done && (_e = _a.return)) _e.call(_a);
                                }
                                finally { if (e_4) throw e_4.error; }
                            }
                        }
                    }
                    catch (e_3_1) { e_3 = { error: e_3_1 }; }
                    finally {
                        try {
                            if (types_2_1 && !types_2_1.done && (_d = types_2.return)) _d.call(types_2);
                        }
                        finally { if (e_3) throw e_3.error; }
                    }
                    visiting = new Set();
                    visited = new Set();
                    sorted = new Map();
                    visit = function (type) {
                        var e_6, _a;
                        if (visiting.has(type.name)) {
                            var last = Array.from(visiting).slice(1, 2);
                            throw new Error("dependency cycle between " + type.name + " and " + last);
                        }
                        if (!visited.has(type.id)) {
                            visiting.add(type.name);
                            if (adj.has(type.id)) {
                                try {
                                    for (var _b = __values(adj.get(type.id).values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                                        var adjId = _c.value;
                                        visit(graph.get(adjId));
                                    }
                                }
                                catch (e_6_1) { e_6 = { error: e_6_1 }; }
                                finally {
                                    try {
                                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                                    }
                                    finally { if (e_6) throw e_6.error; }
                                }
                            }
                            sorted.set(type.id, type);
                            visited.add(type.id);
                            visiting.delete(type.name);
                        }
                    };
                    try {
                        for (types_3 = __values(types), types_3_1 = types_3.next(); !types_3_1.done; types_3_1 = types_3.next()) {
                            type = types_3_1.value;
                            visit(type);
                        }
                    }
                    catch (e_5_1) { e_5 = { error: e_5_1 }; }
                    finally {
                        try {
                            if (types_3_1 && !types_3_1.done && (_f = types_3.return)) _f.call(types_3);
                        }
                        finally { if (e_5) throw e_5.error; }
                    }
                    return [2 /*return*/, sorted];
            }
        });
    });
}
function getMod(name) {
    var parts = name.split("::");
    if (!parts || parts.length !== 2) {
        throw new Error("getMod: invalid name " + name);
    }
    return parts[0];
}
function getName(name) {
    var parts = name.split("::");
    if (!parts || parts.length !== 2) {
        throw new Error("getName: invalid name " + name);
    }
    return parts[1];
}
function snToIdent(name) {
    if (name.includes("::")) {
        throw new Error("snToIdent: invalid name " + name);
    }
    return name.replace(/([^a-zA-Z0-9_]+)/g, "_");
}
function fnToIdent(name) {
    if (!name.includes("::")) {
        throw new Error("fnToIdent: invalid name " + name);
    }
    return name.replace(/([^a-zA-Z0-9_]+)/g, "_");
}
function quote(val) {
    return JSON.stringify(val.toString());
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var con, dir, types_4, modsWithEnums, _loop_1, _a, _b, type, base, body_1, modsWithEnums_1, modsWithEnums_1_1, mod;
        var e_7, _c, e_8, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4 /*yield*/, index_node_1.connect({
                        database: "dump01",
                        user: "yury",
                        host: "localhost",
                    })];
                case 1:
                    con = _e.sent();
                    dir = new DirBuilder();
                    _e.label = 2;
                case 2:
                    _e.trys.push([2, , 4, 6]);
                    return [4 /*yield*/, fetchTypes(con)];
                case 3:
                    types_4 = _e.sent();
                    modsWithEnums = new Set();
                    _loop_1 = function (type) {
                        if (type.kind !== "scalar" ||
                            !type.enum_values ||
                            !type.enum_values.length) {
                            return "continue";
                        }
                        var b = dir.getPath("mods/" + getMod(type.name) + ".ts");
                        b.body.writeln("enum " + getName(type.name) + " {");
                        b.body.indented(function () {
                            var e_9, _a;
                            try {
                                for (var _b = (e_9 = void 0, __values(type.enum_values)), _c = _b.next(); !_c.done; _c = _b.next()) {
                                    var val = _c.value;
                                    b.body.writeln(snToIdent(val) + " = " + quote(val) + ",");
                                }
                            }
                            catch (e_9_1) { e_9 = { error: e_9_1 }; }
                            finally {
                                try {
                                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                                }
                                finally { if (e_9) throw e_9.error; }
                            }
                        });
                        b.body.writeln("}");
                        b.body.nl();
                        modsWithEnums.add(getMod(type.name));
                    };
                    try {
                        for (_a = __values(types_4.values()), _b = _a.next(); !_b.done; _b = _a.next()) {
                            type = _b.value;
                            _loop_1(type);
                        }
                    }
                    catch (e_7_1) { e_7 = { error: e_7_1 }; }
                    finally {
                        try {
                            if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                        }
                        finally { if (e_7) throw e_7.error; }
                    }
                    base = dir.getPath("base.ts");
                    body_1 = base.body;
                    base.head.writeln('import {model} from "edgedb";');
                    try {
                        for (modsWithEnums_1 = __values(modsWithEnums), modsWithEnums_1_1 = modsWithEnums_1.next(); !modsWithEnums_1_1.done; modsWithEnums_1_1 = modsWithEnums_1.next()) {
                            mod = modsWithEnums_1_1.value;
                            base.head.writeln("import type * as " + mod + " from \"./mods/" + mod + "\";");
                        }
                    }
                    catch (e_8_1) { e_8 = { error: e_8_1 }; }
                    finally {
                        try {
                            if (modsWithEnums_1_1 && !modsWithEnums_1_1.done && (_d = modsWithEnums_1.return)) _d.call(modsWithEnums_1);
                        }
                        finally { if (e_8) throw e_8.error; }
                    }
                    body_1.writeln("const base = (function() {");
                    body_1.indented(function () {
                        var e_10, _a;
                        var _loop_2 = function (type) {
                            if (type.kind !== "object") {
                                return "continue";
                            }
                            body_1.writeln("const " + fnToIdent(type.name) + " = {");
                            body_1.indented(function () {
                                var e_11, _a, e_12, _b;
                                try {
                                    for (var _c = (e_11 = void 0, __values(type.bases)), _d = _c.next(); !_d.done; _d = _c.next()) {
                                        var baseType = _d.value.id;
                                        var baseId = types_4.get(baseType).id;
                                        body_1.writeln("..." + fnToIdent(baseId) + ",");
                                        body_1.nl();
                                        var _loop_3 = function (ptr) {
                                            body_1.writeln("get " + ptr.name + "() {");
                                            body_1.indented(function () {
                                                body_1.writeln("return {");
                                                if (ptr.kind === "link") {
                                                    body_1.indented(function () {
                                                        body_1.writeln("kind: model.Kind.link,");
                                                        body_1.writeln("name: " + JSON.stringify(ptr.name) + ",");
                                                    });
                                                }
                                                else {
                                                    body_1.indented(function () {
                                                        body_1.writeln("kind: model.Kind.property,");
                                                        body_1.writeln("name: " + JSON.stringify(ptr.name) + ",");
                                                    });
                                                }
                                            });
                                            body_1.writeln("},");
                                            body_1.nl();
                                        };
                                        try {
                                            for (var _e = (e_12 = void 0, __values(type.pointers)), _f = _e.next(); !_f.done; _f = _e.next()) {
                                                var ptr = _f.value;
                                                _loop_3(ptr);
                                            }
                                        }
                                        catch (e_12_1) { e_12 = { error: e_12_1 }; }
                                        finally {
                                            try {
                                                if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                                            }
                                            finally { if (e_12) throw e_12.error; }
                                        }
                                    }
                                }
                                catch (e_11_1) { e_11 = { error: e_11_1 }; }
                                finally {
                                    try {
                                        if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                                    }
                                    finally { if (e_11) throw e_11.error; }
                                }
                            });
                            body_1.writeln("} as const;");
                            body_1.nl();
                        };
                        try {
                            for (var _b = __values(types_4.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                                var type = _c.value;
                                _loop_2(type);
                            }
                        }
                        catch (e_10_1) { e_10 = { error: e_10_1 }; }
                        finally {
                            try {
                                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                            }
                            finally { if (e_10) throw e_10.error; }
                        }
                    });
                    body_1.writeln("})();");
                    console.log(dir.debug());
                    return [3 /*break*/, 6];
                case 4: return [4 /*yield*/, con.close()];
                case 5:
                    _e.sent();
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    });
}
main();
