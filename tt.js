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
exports.__esModule = true;
var index_node_1 = require("./dist/src/index.node");
throw new Error("aaa");
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
function fetchScalarTypes(con) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, con.query("\n    WITH\n      MODULE schema,\n\n      material_scalars := (\n        SELECT ScalarType {\n          name\n        }\n        FILTER\n          (.name LIKE 'std::%' OR .name LIKE 'cal::%')\n          AND NOT .is_abstract\n      ).name\n\n    SELECT ScalarType {\n      name,\n      enum_values,\n      single material := (\n        SELECT x := ScalarType.ancestors.name\n        FILTER x IN material_scalars\n        LIMIT 1\n      )\n    }\n    FILTER NOT .is_abstract\n    ORDER BY .name;\n  ")];
                case 1: return [2 /*return*/, (_a.sent())];
            }
        });
    });
}
function fetchObjectTypes(con) {
    return __awaiter(this, void 0, void 0, function () {
        var types, graph, adj, types_1, types_1_1, type, types_2, types_2_1, type, _a, _b, base, visiting, visited, sorted, visit, types_3, types_3_1, type;
        var e_1, _c, e_2, _d, e_3, _e, e_4, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0: return [4 /*yield*/, con.query("\n    WITH\n      MODULE schema\n\n    SELECT ObjectType {\n      name,\n      is_abstract,\n      bases: {\n        name,\n      } ORDER BY @index ASC,\n      pointers: {\n        cardinality,\n        required,\n        name,\n        expr,\n        object_target := .target[IS ObjectType] {\n          name,\n          is_compound_type,\n          union_of: {\n            name,\n          },\n          intersection_of: {\n            name,\n          }\n        },\n        scalar_target := .target[IS ScalarType] {\n          name,\n        },\n        array_target := .target[IS Array] {\n          element_type: {\n            name,\n          }\n        },\n        tuple_target := .target[IS Tuple] {\n          element_types: {\n            name,\n            type: {\n              name,\n            }\n          }\n        },\n        [IS Link].properties: {\n          name,\n          target: {\n            name,\n          }\n        } FILTER @is_owned,\n        kind := 'link' IF ObjectType.pointers IS Link ELSE 'property',\n      } FILTER @is_owned,\n    }\n    FILTER NOT .is_compound_type\n    ORDER BY .name;\n  ")];
                case 1:
                    types = _g.sent();
                    graph = new Map();
                    adj = new Map();
                    try {
                        for (types_1 = __values(types), types_1_1 = types_1.next(); !types_1_1.done; types_1_1 = types_1.next()) {
                            type = types_1_1.value;
                            graph.set(type.name, type);
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (types_1_1 && !types_1_1.done && (_c = types_1["return"])) _c.call(types_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    try {
                        for (types_2 = __values(types), types_2_1 = types_2.next(); !types_2_1.done; types_2_1 = types_2.next()) {
                            type = types_2_1.value;
                            try {
                                for (_a = (e_3 = void 0, __values(type.bases)), _b = _a.next(); !_b.done; _b = _a.next()) {
                                    base = _b.value.name;
                                    if (graph.has(base)) {
                                        if (!adj.has(type.name)) {
                                            adj.set(type.name, new Set());
                                        }
                                        adj.get(type.name).add(base);
                                    }
                                    else {
                                        throw new Error("reference to an unknown object type: " + base);
                                    }
                                }
                            }
                            catch (e_3_1) { e_3 = { error: e_3_1 }; }
                            finally {
                                try {
                                    if (_b && !_b.done && (_e = _a["return"])) _e.call(_a);
                                }
                                finally { if (e_3) throw e_3.error; }
                            }
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (types_2_1 && !types_2_1.done && (_d = types_2["return"])) _d.call(types_2);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                    visiting = new Set();
                    visited = new Set();
                    sorted = [];
                    visit = function (type) {
                        var e_5, _a;
                        if (visiting.has(type.name)) {
                            var last = Array.from(visiting).slice(1, 2);
                            throw new Error("dependency cycle between " + type.name + " and " + last);
                        }
                        if (!visited.has(type.name)) {
                            visiting.add(type.name);
                            if (adj.has(type.name)) {
                                try {
                                    for (var _b = __values(adj.get(type.name).values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                                        var adjName = _c.value;
                                        visit(graph.get(adjName));
                                    }
                                }
                                catch (e_5_1) { e_5 = { error: e_5_1 }; }
                                finally {
                                    try {
                                        if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
                                    }
                                    finally { if (e_5) throw e_5.error; }
                                }
                            }
                            sorted.push(type);
                            visited.add(type.name);
                            visiting["delete"](type.name);
                        }
                    };
                    try {
                        for (types_3 = __values(types), types_3_1 = types_3.next(); !types_3_1.done; types_3_1 = types_3.next()) {
                            type = types_3_1.value;
                            visit(type);
                        }
                    }
                    catch (e_4_1) { e_4 = { error: e_4_1 }; }
                    finally {
                        try {
                            if (types_3_1 && !types_3_1.done && (_f = types_3["return"])) _f.call(types_3);
                        }
                        finally { if (e_4) throw e_4.error; }
                    }
                    return [2 /*return*/, sorted];
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var con, scalars_1, types_4, builder_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, index_node_1.connect({
                        database: "dump01_cli",
                        user: "yury",
                        host: "localhost"
                    })];
                case 1:
                    con = _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, , 5, 7]);
                    return [4 /*yield*/, fetchScalarTypes(con)];
                case 3:
                    scalars_1 = _a.sent();
                    return [4 /*yield*/, fetchObjectTypes(con)];
                case 4:
                    types_4 = _a.sent();
                    builder_1 = new CodeBuilder();
                    builder_1.writeln('import {model} from "edgedb";');
                    builder_1.nl();
                    builder_1.writeln("const base = (function() {");
                    builder_1.indented(function () {
                        var e_6, _a, e_7, _b;
                        try {
                            for (var scalars_2 = __values(scalars_1), scalars_2_1 = scalars_2.next(); !scalars_2_1.done; scalars_2_1 = scalars_2.next()) {
                                var scalas = scalars_2_1.value;
                            }
                        }
                        catch (e_6_1) { e_6 = { error: e_6_1 }; }
                        finally {
                            try {
                                if (scalars_2_1 && !scalars_2_1.done && (_a = scalars_2["return"])) _a.call(scalars_2);
                            }
                            finally { if (e_6) throw e_6.error; }
                        }
                        var _loop_1 = function (type) {
                            var _a = __read(type.name.split("::", 2), 2), mod = _a[0], name_1 = _a[1];
                            builder_1.writeln("const " + mod + "__" + name_1 + " = {");
                            builder_1.indented(function () {
                                var e_8, _a, e_9, _b;
                                try {
                                    for (var _c = (e_8 = void 0, __values(type.bases)), _d = _c.next(); !_d.done; _d = _c.next()) {
                                        var base = _d.value.name;
                                        var _e = __read(base.split("::", 2), 2), bm = _e[0], bn = _e[1];
                                        builder_1.writeln("..." + bm + "__" + bn + ",");
                                        builder_1.nl();
                                        var _loop_2 = function (ptr) {
                                            builder_1.writeln("get " + ptr.name + "() {");
                                            builder_1.indented(function () {
                                                builder_1.writeln("return {");
                                                if (ptr.kind === "link") {
                                                    builder_1.indented(function () {
                                                        builder_1.writeln("kind: model.Kind.link,");
                                                        builder_1.writeln("name: " + JSON.stringify(ptr.name) + ",");
                                                    });
                                                }
                                                else {
                                                    builder_1.indented(function () {
                                                        builder_1.writeln("kind: model.Kind.property,");
                                                        builder_1.writeln("name: " + JSON.stringify(ptr.name) + ",");
                                                    });
                                                }
                                            });
                                            builder_1.writeln("},");
                                            builder_1.nl();
                                        };
                                        try {
                                            for (var _f = (e_9 = void 0, __values(type.pointers)), _g = _f.next(); !_g.done; _g = _f.next()) {
                                                var ptr = _g.value;
                                                _loop_2(ptr);
                                            }
                                        }
                                        catch (e_9_1) { e_9 = { error: e_9_1 }; }
                                        finally {
                                            try {
                                                if (_g && !_g.done && (_b = _f["return"])) _b.call(_f);
                                            }
                                            finally { if (e_9) throw e_9.error; }
                                        }
                                    }
                                }
                                catch (e_8_1) { e_8 = { error: e_8_1 }; }
                                finally {
                                    try {
                                        if (_d && !_d.done && (_a = _c["return"])) _a.call(_c);
                                    }
                                    finally { if (e_8) throw e_8.error; }
                                }
                            });
                            builder_1.writeln("} as const;");
                            builder_1.nl();
                        };
                        try {
                            for (var types_5 = __values(types_4), types_5_1 = types_5.next(); !types_5_1.done; types_5_1 = types_5.next()) {
                                var type = types_5_1.value;
                                _loop_1(type);
                            }
                        }
                        catch (e_7_1) { e_7 = { error: e_7_1 }; }
                        finally {
                            try {
                                if (types_5_1 && !types_5_1.done && (_b = types_5["return"])) _b.call(types_5);
                            }
                            finally { if (e_7) throw e_7.error; }
                        }
                    });
                    builder_1.writeln("})();");
                    console.log(builder_1.render());
                    return [3 /*break*/, 7];
                case 5: return [4 /*yield*/, con.close()];
                case 6:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 7: return [2 /*return*/];
            }
        });
    });
}
main();
