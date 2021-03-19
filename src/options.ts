import * as errors from "./errors";

export type BackoffFunction = (n: number) => number;

export function default_backoff(attempt: number): number {
  return 2 ** attempt * 100 + Math.random() * 100;
}

export enum IsolationLevel {
  Serializable = "SERIALIZABLE",
  RepeatableRead = "REPEATABLE READ",
}

export enum RetryCondition {
  SerializationError,
  Deadlock,
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

export class RetryOptions {
  readonly default: RetryRule;
  private overrides: Map<RetryCondition, RetryRule>;

  constructor(attempts: number, backoff: BackoffFunction) {
    this.default = new RetryRule(attempts, backoff);
    this.overrides = new Map();
  }

  withRule(
    condition: RetryCondition,
    attempts?: number,
    backoff?: BackoffFunction
  ): RetryOptions {
    const def = this.default;
    const overrides = new Map(this.overrides);
    overrides.set(
      condition,
      new RetryRule(attempts ?? def.attempts, backoff ?? def.backoff)
    );
    const result = Object.create(RetryOptions.prototype);
    result.default = def;
    result.overrides = overrides;
    return result;
  }

  getRuleForException(err: errors.EdgeDBError): RetryRule {
    let result;
    if(err instanceof errors.TransactionSerializationError) {
        result = this.overrides.get(RetryCondition.SerializationError)
    } else if(err instanceof errors.TransactionDeadlockError) {
        result = this.overrides.get(RetryCondition.Deadlock)
    } else if(err instanceof errors.ClientError) {
        result = this.overrides.get(RetryCondition.NetworkError)
    }
    return result ?? this.default;
  }

  static defaults(): RetryOptions {
    return new RetryOptions(3, default_backoff);
  }
}

export class TransactionOptions {
  readonly isolation: IsolationLevel;
  readonly readonly: boolean;
  readonly deferrable: boolean;
  constructor({
    isolation = IsolationLevel.RepeatableRead,
    readonly = false,
    deferrable = false,
  }: {
    isolation?: IsolationLevel;
    readonly?: boolean;
    deferrable?: boolean;
  } = {}) {
    this.isolation = isolation;
    this.readonly = readonly;
    this.deferrable = deferrable;
  }

  static defaults(): TransactionOptions {
    return new TransactionOptions();
  }
}

export class Options {
  readonly retryOptions: RetryOptions;
  readonly transactionOptions: TransactionOptions;

  constructor({
    retryOptions = RetryOptions.defaults(),
    transactionOptions = TransactionOptions.defaults(),
  }: {
    retryOptions?: RetryOptions;
    transactionOptions?: TransactionOptions;
  } = {}) {
    this.retryOptions = retryOptions;
    this.transactionOptions = transactionOptions;
  }

  withTransactionOptions(
    opt: TransactionOptions | Partial<TransactionOptions>
  ): Options {
    const result = Object.create(Options);
    result.retryOptions = this.retryOptions;
    if (opt instanceof TransactionOptions) {
      result.transactionOptions = opt;
    } else {
      result.transactionOptions = new TransactionOptions(opt);
    }
    return result;
  }

  withRetryOptions(opt: RetryOptions | PartialRetryRule): Options {
    const result = Object.create(Options);
    result.transactionOptions = this.transactionOptions;
    if (opt instanceof RetryOptions) {
      result.retryOptions = opt;
    } else if (opt.condition) {
      result.retryOptions = this.retryOptions.withRule(
        opt.condition,
        opt.attempts,
        opt.backoff
      );
    } else {
      const old = result.retryOptions;
      result.retryOptions = new RetryOptions(
        opt.attempts ?? old.attempts,
        opt.backoff ?? old.backoff
      );
    }
    return result;
  }

  static defaults(): Options {
    return new Options();
  }
}
