/* AUTOGENERATED */

/*!
 * This source file is part of the EdgeDB open source project.
 *
 * Copyright 2019-present MagicStack Inc. and the EdgeDB authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* tslint:disable */

export class EdgeDBError extends Error {}

export class InternalServerError extends EdgeDBError {
  get code(): number {
    return 0x01_00_00_00;
  }
}

export class UnsupportedFeatureError extends EdgeDBError {
  get code(): number {
    return 0x02_00_00_00;
  }
}

export class ProtocolError extends EdgeDBError {
  get code(): number {
    return 0x03_00_00_00;
  }
}

export class BinaryProtocolError extends ProtocolError {
  get code(): number {
    return 0x03_01_00_00;
  }
}

export class UnsupportedProtocolVersionError extends BinaryProtocolError {
  get code(): number {
    return 0x03_01_00_01;
  }
}

export class TypeSpecNotFoundError extends BinaryProtocolError {
  get code(): number {
    return 0x03_01_00_02;
  }
}

export class UnexpectedMessageError extends BinaryProtocolError {
  get code(): number {
    return 0x03_01_00_03;
  }
}

export class InputDataError extends ProtocolError {
  get code(): number {
    return 0x03_02_00_00;
  }
}

export class ResultCardinalityMismatchError extends ProtocolError {
  get code(): number {
    return 0x03_03_00_00;
  }
}

export class CapabilityError extends ProtocolError {
  get code(): number {
    return 0x03_04_00_00;
  }
}

export class UnsupportedCapabilityError extends CapabilityError {
  get code(): number {
    return 0x03_04_01_00;
  }
}

export class DisabledCapabilityError extends CapabilityError {
  get code(): number {
    return 0x03_04_02_00;
  }
}

export class QueryError extends EdgeDBError {
  get code(): number {
    return 0x04_00_00_00;
  }
}

export class InvalidSyntaxError extends QueryError {
  get code(): number {
    return 0x04_01_00_00;
  }
}

export class EdgeQLSyntaxError extends InvalidSyntaxError {
  get code(): number {
    return 0x04_01_01_00;
  }
}

export class SchemaSyntaxError extends InvalidSyntaxError {
  get code(): number {
    return 0x04_01_02_00;
  }
}

export class GraphQLSyntaxError extends InvalidSyntaxError {
  get code(): number {
    return 0x04_01_03_00;
  }
}

export class InvalidTypeError extends QueryError {
  get code(): number {
    return 0x04_02_00_00;
  }
}

export class InvalidTargetError extends InvalidTypeError {
  get code(): number {
    return 0x04_02_01_00;
  }
}

export class InvalidLinkTargetError extends InvalidTargetError {
  get code(): number {
    return 0x04_02_01_01;
  }
}

export class InvalidPropertyTargetError extends InvalidTargetError {
  get code(): number {
    return 0x04_02_01_02;
  }
}

export class InvalidReferenceError extends QueryError {
  get code(): number {
    return 0x04_03_00_00;
  }
}

export class UnknownModuleError extends InvalidReferenceError {
  get code(): number {
    return 0x04_03_00_01;
  }
}

export class UnknownLinkError extends InvalidReferenceError {
  get code(): number {
    return 0x04_03_00_02;
  }
}

export class UnknownPropertyError extends InvalidReferenceError {
  get code(): number {
    return 0x04_03_00_03;
  }
}

export class UnknownUserError extends InvalidReferenceError {
  get code(): number {
    return 0x04_03_00_04;
  }
}

export class UnknownDatabaseError extends InvalidReferenceError {
  get code(): number {
    return 0x04_03_00_05;
  }
}

export class UnknownParameterError extends InvalidReferenceError {
  get code(): number {
    return 0x04_03_00_06;
  }
}

export class SchemaError extends QueryError {
  get code(): number {
    return 0x04_04_00_00;
  }
}

export class SchemaDefinitionError extends QueryError {
  get code(): number {
    return 0x04_05_00_00;
  }
}

export class InvalidDefinitionError extends SchemaDefinitionError {
  get code(): number {
    return 0x04_05_01_00;
  }
}

export class InvalidModuleDefinitionError extends InvalidDefinitionError {
  get code(): number {
    return 0x04_05_01_01;
  }
}

export class InvalidLinkDefinitionError extends InvalidDefinitionError {
  get code(): number {
    return 0x04_05_01_02;
  }
}

export class InvalidPropertyDefinitionError extends InvalidDefinitionError {
  get code(): number {
    return 0x04_05_01_03;
  }
}

export class InvalidUserDefinitionError extends InvalidDefinitionError {
  get code(): number {
    return 0x04_05_01_04;
  }
}

export class InvalidDatabaseDefinitionError extends InvalidDefinitionError {
  get code(): number {
    return 0x04_05_01_05;
  }
}

export class InvalidOperatorDefinitionError extends InvalidDefinitionError {
  get code(): number {
    return 0x04_05_01_06;
  }
}

export class InvalidAliasDefinitionError extends InvalidDefinitionError {
  get code(): number {
    return 0x04_05_01_07;
  }
}

export class InvalidFunctionDefinitionError extends InvalidDefinitionError {
  get code(): number {
    return 0x04_05_01_08;
  }
}

export class InvalidConstraintDefinitionError extends InvalidDefinitionError {
  get code(): number {
    return 0x04_05_01_09;
  }
}

export class InvalidCastDefinitionError extends InvalidDefinitionError {
  get code(): number {
    return 0x04_05_01_0a;
  }
}

export class DuplicateDefinitionError extends SchemaDefinitionError {
  get code(): number {
    return 0x04_05_02_00;
  }
}

export class DuplicateModuleDefinitionError extends DuplicateDefinitionError {
  get code(): number {
    return 0x04_05_02_01;
  }
}

export class DuplicateLinkDefinitionError extends DuplicateDefinitionError {
  get code(): number {
    return 0x04_05_02_02;
  }
}

export class DuplicatePropertyDefinitionError extends DuplicateDefinitionError {
  get code(): number {
    return 0x04_05_02_03;
  }
}

export class DuplicateUserDefinitionError extends DuplicateDefinitionError {
  get code(): number {
    return 0x04_05_02_04;
  }
}

export class DuplicateDatabaseDefinitionError extends DuplicateDefinitionError {
  get code(): number {
    return 0x04_05_02_05;
  }
}

export class DuplicateOperatorDefinitionError extends DuplicateDefinitionError {
  get code(): number {
    return 0x04_05_02_06;
  }
}

export class DuplicateViewDefinitionError extends DuplicateDefinitionError {
  get code(): number {
    return 0x04_05_02_07;
  }
}

export class DuplicateFunctionDefinitionError extends DuplicateDefinitionError {
  get code(): number {
    return 0x04_05_02_08;
  }
}

export class DuplicateConstraintDefinitionError extends DuplicateDefinitionError {
  get code(): number {
    return 0x04_05_02_09;
  }
}

export class DuplicateCastDefinitionError extends DuplicateDefinitionError {
  get code(): number {
    return 0x04_05_02_0a;
  }
}

export class QueryTimeoutError extends QueryError {
  get code(): number {
    return 0x04_06_00_00;
  }
}

export class ExecutionError extends EdgeDBError {
  get code(): number {
    return 0x05_00_00_00;
  }
}

export class InvalidValueError extends ExecutionError {
  get code(): number {
    return 0x05_01_00_00;
  }
}

export class DivisionByZeroError extends InvalidValueError {
  get code(): number {
    return 0x05_01_00_01;
  }
}

export class NumericOutOfRangeError extends InvalidValueError {
  get code(): number {
    return 0x05_01_00_02;
  }
}

export class IntegrityError extends ExecutionError {
  get code(): number {
    return 0x05_02_00_00;
  }
}

export class ConstraintViolationError extends IntegrityError {
  get code(): number {
    return 0x05_02_00_01;
  }
}

export class CardinalityViolationError extends IntegrityError {
  get code(): number {
    return 0x05_02_00_02;
  }
}

export class MissingRequiredError extends IntegrityError {
  get code(): number {
    return 0x05_02_00_03;
  }
}

export class TransactionError extends ExecutionError {
  get code(): number {
    return 0x05_03_00_00;
  }
}

export class TransactionSerializationError extends TransactionError {
  get code(): number {
    return 0x05_03_00_01;
  }
}

export class TransactionDeadlockError extends TransactionError {
  get code(): number {
    return 0x05_03_00_02;
  }
}

export class ConfigurationError extends EdgeDBError {
  get code(): number {
    return 0x06_00_00_00;
  }
}

export class AccessError extends EdgeDBError {
  get code(): number {
    return 0x07_00_00_00;
  }
}

export class AuthenticationError extends AccessError {
  get code(): number {
    return 0x07_01_00_00;
  }
}

export class LogMessage extends EdgeDBError {
  get code(): number {
    return 0xf0_00_00_00;
  }
}

export class WarningMessage extends LogMessage {
  get code(): number {
    return 0xf0_01_00_00;
  }
}

export class ClientError extends EdgeDBError {
  get code(): number {
    return 0xff_00_00_00;
  }
}

export class ClientConnectionError extends ClientError {
  get code(): number {
    return 0xff_01_00_00;
  }
}

export class InterfaceError extends ClientError {
  get code(): number {
    return 0xff_02_00_00;
  }
}

export class QueryArgumentError extends InterfaceError {
  get code(): number {
    return 0xff_02_01_00;
  }
}

export class MissingArgumentError extends QueryArgumentError {
  get code(): number {
    return 0xff_02_01_01;
  }
}

export class UnknownArgumentError extends QueryArgumentError {
  get code(): number {
    return 0xff_02_01_02;
  }
}

export class InvalidArgumentError extends QueryArgumentError {
  get code(): number {
    return 0xff_02_01_03;
  }
}

export class NoDataError extends ClientError {
  get code(): number {
    return 0xff_03_00_00;
  }
}
