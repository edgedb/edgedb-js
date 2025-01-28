import * as errors from "./errors/index";
import { utf8Encoder } from "./primitives/buffer";
import type { Mutable } from "./typeutil";
import type { Codecs } from "./codecs/codecs";
import { SQLRowModeArray } from "./codecs/record";
import type { ReadonlyCodecMap, MutableCodecMap } from "./codecs/context";
import { CodecContext, NOOP_CODEC_CONTEXT } from "./codecs/context";

export type BackoffFunction = (n: number) => number;

export function defaultBackoff(attempt: number): number {
  return 2 ** attempt * 100 + Math.random() * 100;
}

export enum IsolationLevel {
  Serializable = "SERIALIZABLE",
}

export enum RetryCondition {
  TransactionConflict,
  NetworkError,
}

class RetryRule {
  readonly attempts: number;
  readonly backoff: BackoffFunction;
  constructor(attempts: number, backoff: BackoffFunction) {
    this.attempts = attempts;
    this.backoff = backoff;
  }
}

export interface PartialRetryRule {
  condition?: RetryCondition;
  attempts?: number;
  backoff?: BackoffFunction;
}

export interface SimpleRetryOptions {
  attempts?: number;
  backoff?: BackoffFunction;
}

export type WarningHandler = (warnings: errors.EdgeDBError[]) => void;

export function throwWarnings(warnings: errors.EdgeDBError[]) {
  throw new Error(
    `warnings occurred while running query: ${warnings.map((warn) => warn.message)}`,
    { cause: warnings },
  );
}

export function logWarnings(warnings: errors.EdgeDBError[]) {
  for (const warning of warnings) {
    console.warn(
      new Error(`EdgeDB warning: ${warning.message}`, { cause: warning }),
    );
  }
}

export class RetryOptions {
  // This type is immutable.

  readonly default: RetryRule;
  private overrides: ReadonlyMap<RetryCondition, RetryRule>;

  constructor(attempts = 3, backoff: BackoffFunction = defaultBackoff) {
    this.default = new RetryRule(attempts, backoff);
    this.overrides = new Map();
  }

  withRule(
    condition: RetryCondition,
    attempts?: number,
    backoff?: BackoffFunction,
  ): RetryOptions {
    const def = this.default;
    const overrides = new Map(this.overrides);
    overrides.set(
      condition,
      new RetryRule(attempts ?? def.attempts, backoff ?? def.backoff),
    );
    const result = Object.create(RetryOptions.prototype);
    result.default = def;
    result.overrides = overrides;
    return result;
  }

  getRuleForException(err: errors.EdgeDBError): RetryRule {
    let result;
    if (err instanceof errors.TransactionConflictError) {
      result = this.overrides.get(RetryCondition.TransactionConflict);
    } else if (err instanceof errors.ClientError) {
      result = this.overrides.get(RetryCondition.NetworkError);
    }
    return result ?? this.default;
  }

  static defaults(): RetryOptions {
    return _retryOptionsDefault;
  }
}

const _retryOptionsDefault = new RetryOptions();

export interface SimpleTransactionOptions {
  isolation?: IsolationLevel;
  readonly?: boolean;
  deferrable?: boolean;
}

export class TransactionOptions {
  // This type is immutable.

  readonly isolation: IsolationLevel;
  readonly readonly: boolean;
  readonly deferrable: boolean;
  constructor({
    isolation = IsolationLevel.Serializable,
    readonly = false,
    deferrable = false,
  }: SimpleTransactionOptions = {}) {
    this.isolation = isolation;
    this.readonly = readonly;
    this.deferrable = deferrable;
  }

  static defaults(): TransactionOptions {
    return _defaultTransactionOptions;
  }
}

const _defaultTransactionOptions = new TransactionOptions();

const TAG_ANNOTATION_KEY = "tag";

export interface SerializedSessionState {
  module?: string;
  aliases?: [string, string][];
  config?: { [name: string]: unknown };
  globals?: { [name: string]: unknown };
}

export interface CodecSpec {
  encode: (data: any) => any;
  decode: (data: any) => any;
}

export type OptionsList = {
  module?: string;
  moduleAliases?: Record<string, string>;
  config?: Record<string, any>;
  globals?: Record<string, any>;
  retryOptions?: RetryOptions;
  transactionOptions?: TransactionOptions;
  warningHandler?: WarningHandler;
  codecs?: Codecs.CodecSpec;
};

type MergeOptions = OptionsList & {
  _dropSQLRowCodec?: boolean;
};

export class Options {
  // This type is immutable.

  private static schemaVersion: number = 0;

  readonly module: string;
  readonly moduleAliases: ReadonlyMap<string, string>;
  readonly config: ReadonlyMap<string, any>;
  readonly globals: ReadonlyMap<string, any>;
  readonly retryOptions: RetryOptions;
  readonly transactionOptions: TransactionOptions;
  readonly codecs: ReadonlyCodecMap;
  readonly warningHandler: WarningHandler;

  /** @internal */
  readonly annotations: ReadonlyMap<string, string> = new Map<string, string>();

  private cachedCodecContext: CodecContext | null = null;
  private cachedCodecContextVer = -1;

  get tag(): string | null {
    return this.annotations.get(TAG_ANNOTATION_KEY) ?? null;
  }

  static signalSchemaChange() {
    this.schemaVersion += 1;
  }

  constructor({
    retryOptions = RetryOptions.defaults(),
    transactionOptions = TransactionOptions.defaults(),
    warningHandler = logWarnings,
    module = "default",
    moduleAliases = {},
    config = {},
    globals = {},
    codecs = {},
  }: OptionsList = {}) {
    this.retryOptions = retryOptions;
    this.transactionOptions = transactionOptions;
    this.warningHandler = warningHandler;
    this.module = module;
    this.moduleAliases = new Map(Object.entries(moduleAliases));
    this.config = new Map(Object.entries(config));
    this.globals = new Map(Object.entries(globals));
    this.codecs = new Map(Object.entries(codecs)) as ReadonlyCodecMap;
  }

  public makeCodecContext(): CodecContext {
    if (this.codecs.size === 0) {
      return NOOP_CODEC_CONTEXT;
    }

    if (this.cachedCodecContextVer === Options.schemaVersion) {
      /* We really want to cache CodecContext because it works fast
         when it's "warm", i.e. enough kinds of scalar types went through
         it to populate its internal mapping of 'type name => user codec'.
         This is a complication of the fact that users can define client
         codecs for user-defined scalar types, and correct codec selection
         requires correct "order of resolution", the cost of building which
         is non-negligible.
      */
      return this.cachedCodecContext!;
    }

    const ctx = new CodecContext(this.codecs);
    this.cachedCodecContext = ctx;
    this.cachedCodecContextVer = Options.schemaVersion;
    return ctx;
  }

  private _cloneWith(mergeOptions: MergeOptions) {
    const clone: Mutable<Options> = Object.create(Options.prototype);

    clone.annotations = this.annotations;

    clone.retryOptions = mergeOptions.retryOptions ?? this.retryOptions;
    clone.transactionOptions =
      mergeOptions.transactionOptions ?? this.transactionOptions;
    clone.warningHandler = mergeOptions.warningHandler ?? this.warningHandler;

    if (mergeOptions.config != null) {
      clone.config = new Map([
        ...this.config,
        ...Object.entries(mergeOptions.config),
      ]);
    } else {
      clone.config = this.config;
    }

    if (mergeOptions.globals != null) {
      clone.globals = new Map([
        ...this.globals,
        ...Object.entries(mergeOptions.globals),
      ]);
    } else {
      clone.globals = this.globals;
    }

    if (mergeOptions.moduleAliases != null) {
      clone.moduleAliases = new Map([
        ...this.moduleAliases,
        ...Object.entries(mergeOptions.moduleAliases),
      ]);
    } else {
      clone.moduleAliases = this.moduleAliases;
    }

    if (mergeOptions.codecs != null) {
      clone.codecs = new Map([
        ...this.codecs,
        ...Object.entries(mergeOptions.codecs),
      ]) as ReadonlyCodecMap;
    } else {
      clone.codecs = this.codecs;
    }

    if (mergeOptions._dropSQLRowCodec && clone.codecs.has("sql_row")) {
      // This is an optimization -- if "sql_row" is the only codec defined
      // and it's set to "object mode", the we want the codec mapping to be
      // empty instead. Why? Empty codec mapping short circuits a lot of
      // custom codec code, and object is the default behavior anyway.
      (clone.codecs as MutableCodecMap).delete("sql_row");
    }

    clone.module = mergeOptions.module ?? this.module;

    return clone as Options;
  }

  /** @internal */
  _serialise() {
    const state: SerializedSessionState = {};
    if (this.module !== "default") {
      state.module = this.module;
    }
    if (this.moduleAliases.size) {
      state.aliases = Array.from(this.moduleAliases.entries());
    }
    if (this.config.size) {
      state.config = Object.fromEntries(this.config.entries());
    }
    if (this.globals.size) {
      const globs: Record<string, any> = {};
      for (const [key, val] of this.globals.entries()) {
        globs[key.includes("::") ? key : `${this.module}::${key}`] = val;
      }
      state.globals = globs;
    }
    return state;
  }

  withModuleAliases({
    module,
    ...aliases
  }: {
    [name: string]: string;
  }): Options {
    return this._cloneWith({
      module: module ?? this.module,
      moduleAliases: aliases,
    });
  }

  withConfig(config: Record<string, any>): Options {
    return this._cloneWith({ config });
  }

  withCodecs(codecs: Codecs.CodecSpec): Options {
    return this._cloneWith({ codecs });
  }

  withSQLRowMode(mode: "array" | "object"): Options {
    if (mode === "object") {
      return this._cloneWith({ _dropSQLRowCodec: true });
    } else if (mode === "array") {
      return this._cloneWith({ codecs: SQLRowModeArray });
    } else {
      throw new errors.InterfaceError(`invalid mode=${mode}`);
    }
  }

  withGlobals(globals: Record<string, any>): Options {
    return this._cloneWith({
      globals: { ...this.globals, ...globals },
    });
  }

  withQueryTag(tag: string | null): Options {
    const annos = new Map(this.annotations);
    if (tag != null) {
      if (tag.startsWith("edgedb/")) {
        throw new errors.InterfaceError("reserved tag: edgedb/*");
      }
      if (tag.startsWith("gel/")) {
        throw new errors.InterfaceError("reserved tag: gel/*");
      }
      if (utf8Encoder.encode(tag).length > 128) {
        throw new errors.InterfaceError("tag too long (> 128 bytes)");
      }
      annos.set(TAG_ANNOTATION_KEY, tag);
    } else {
      annos.delete(TAG_ANNOTATION_KEY);
    }

    const clone: Mutable<Options> = this._cloneWith({});
    clone.annotations = annos;

    return clone as Options;
  }

  withTransactionOptions(
    opt: TransactionOptions | SimpleTransactionOptions,
  ): Options {
    return this._cloneWith({
      transactionOptions:
        opt instanceof TransactionOptions ? opt : new TransactionOptions(opt),
    });
  }

  withRetryOptions(opt: RetryOptions | SimpleRetryOptions): Options {
    return this._cloneWith({
      retryOptions:
        opt instanceof RetryOptions
          ? opt
          : new RetryOptions(opt.attempts, opt.backoff),
    });
  }

  withWarningHandler(handler: WarningHandler): Options {
    return this._cloneWith({ warningHandler: handler });
  }

  isDefaultSession() {
    return (
      this.config.size === 0 &&
      this.globals.size === 0 &&
      this.moduleAliases.size === 0 &&
      this.module === "default"
    );
  }

  static defaults(): Options {
    return _defaultOptions;
  }
}

const _defaultOptions = new Options();
