import {reflection as $} from "edgedb";
import type * as schemaTypes from "./schema";
import type * as sysEnums from "../modules/sys";

export interface SystemObject extends schemaTypes.AnnotationSubject {
}

export interface Database extends SystemObject, schemaTypes.AnnotationSubject {
  name: $.PropertyDesc<string, $.Cardinality.One>;
}

export interface ExtensionPackage extends SystemObject, schemaTypes.AnnotationSubject {
  script: $.PropertyDesc<string, $.Cardinality.One>;
  version: $.PropertyDesc<{major: number,minor: number,stage: sysEnums.VersionStage,stage_no: number,local: string[]}, $.Cardinality.One>;
}

export interface Role extends SystemObject, schemaTypes.InheritingObject, schemaTypes.AnnotationSubject {
  name: $.PropertyDesc<string, $.Cardinality.One>;
  superuser: $.PropertyDesc<boolean, $.Cardinality.One>;
  is_superuser: $.PropertyDesc<boolean, $.Cardinality.One>;
  password: $.PropertyDesc<string, $.Cardinality.AtMostOne>;
  member_of: $.LinkDesc<Role, $.Cardinality.Many>;
}
