import * as errors from "./errors";

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

export class RetryOptions {
  readonly default: RetryRule;
  private overrides: Map<RetryCondition, RetryRule>;

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
    return new RetryOptions();
  }
}

export interface SimpleTransactionOptions {
  isolation?: IsolationLevel;
  readonly?: boolean;
  deferrable?: boolean;
}

export class TransactionOptions {
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
    return new TransactionOptions();
  }
}

export interface SessionOptions {
  module?: string;
  moduleAliases?: Record<string, string>;
  config?: Record<string, any>;
  globals?: Record<string, any>;
}

export interface SerializedSessionState {
  module?: string;
  aliases?: [string, string][];
  config?: { [name: string]: unknown };
  globals?: { [name: string]: unknown };
}

export class Session {
  readonly module: string;
  readonly moduleAliases: Record<string, string>;
  readonly config: Record<string, any>;
  readonly globals: Record<string, any>;

  constructor({
    module = "default",
    moduleAliases = {},
    config = {},
    globals = {},
  }: SessionOptions = {}) {
    this.module = module;
    this.moduleAliases = moduleAliases;
    this.config = config;
    this.globals = globals;
  }

  withModuleAliases({
    module,
    ...aliases
  }: {
    [name: string]: string;
  }): Session {
    return new Session({
      ...this,
      module: module ?? this.module,
      moduleAliases: { ...this.moduleAliases, ...aliases },
    });
  }

  withConfig(config: { [name: string]: any }): Session {
    return new Session({
      ...this,
      config: { ...this.config, ...config },
    });
  }

  withGlobals(globals: { [name: string]: any }): Session {
    return new Session({
      ...this,
      globals: { ...this.globals, ...globals },
    });
  }

  /** @internal */
  _serialise() {
    const state: SerializedSessionState = {};
    if (this.module !== "default") {
      state.module = this.module;
    }
    const _aliases = Object.entries(this.moduleAliases);
    if (_aliases.length) {
      state.aliases = _aliases;
    }
    if (Object.keys(this.config).length) {
      state.config = this.config;
    }
    const _globals = Object.entries(this.globals);
    if (_globals.length) {
      state.globals = _globals.reduce(
        (globals, [key, val]) => {
          globals[key.includes("::") ? key : `${this.module}::${key}`] = val;
          return globals;
        },
        {} as { [key: string]: any },
      );
    }
    return state;
  }

  static defaults(): Session {
    return defaultSession;
  }
}

const defaultSession = new Session();

export class Options {
  readonly retryOptions: RetryOptions;
  readonly transactionOptions: TransactionOptions;
  readonly session: Session;

  constructor({
    retryOptions = RetryOptions.defaults(),
    transactionOptions = TransactionOptions.defaults(),
    session = Session.defaults(),
  }: {
    retryOptions?: RetryOptions;
    transactionOptions?: TransactionOptions;
    session?: Session;
  } = {}) {
    this.retryOptions = retryOptions;
    this.transactionOptions = transactionOptions;
    this.session = session;
  }

  withTransactionOptions(
    opt: TransactionOptions | SimpleTransactionOptions,
  ): Options {
    return new Options({
      ...this,
      transactionOptions:
        opt instanceof TransactionOptions ? opt : new TransactionOptions(opt),
    });
  }

  withRetryOptions(opt: RetryOptions | SimpleRetryOptions): Options {
    return new Options({
      ...this,
      retryOptions:
        opt instanceof RetryOptions
          ? opt
          : new RetryOptions(opt.attempts, opt.backoff),
    });
  }

  withSession(opt: Session): Options {
    return new Options({
      ...this,
      session: opt,
    });
  }

  static defaults(): Options {
    return new Options();
  }
}
