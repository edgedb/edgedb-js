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
  attempts: number;
  backoff: BackoffFunction;
  constructor(attempts: number, backoff: BackoffFunction) {
    this.attempts = attempts;
    this.backoff = backoff;
    Object.freeze(this);
  }
}

interface PartialRetryRule {
  condition?: RetryCondition;
  attempts?: number;
  backoff?: BackoffFunction;
}

export class RetryOptions {
  default: RetryRule;
  private overrides: Map<RetryCondition, RetryRule>;
  constructor(attempts: number, backoff: BackoffFunction) {
    this.default = new RetryRule(attempts, backoff);
    this.overrides = new Map();
    Object.freeze(this);
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
    return Object.freeze(result);
  }
  static defaults(): RetryOptions {
    return new RetryOptions(3, default_backoff);
  }
}

export class TransactionOptions {
  isolation: IsolationLevel;
  readonly: boolean;
  deferrable: boolean;
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
    Object.freeze(this);
  }
  static defaults(): TransactionOptions {
    return new TransactionOptions();
  }
}

export class Options {
  retry_options: RetryOptions;
  transaction_options: TransactionOptions;

  constructor({
    retry_options = RetryOptions.defaults(),
    transaction_options = TransactionOptions.defaults(),
  }: {
    retry_options?: RetryOptions;
    transaction_options?: TransactionOptions;
  } = {}) {
    this.retry_options = retry_options;
    this.transaction_options = transaction_options;
    Object.freeze(this);
  }

  withTransactionOptions(
    opt: TransactionOptions | Partial<TransactionOptions>
  ): Options {
    const result = Object.create(Options);
    result.retry_options = this.retry_options;
    if (opt instanceof TransactionOptions) {
      result.transaction_options = opt;
    } else {
      result.transaction_options = new TransactionOptions(opt);
    }
    return Object.freeze(result);
  }

  withRetryOptions(opt: RetryOptions | PartialRetryRule): Options {
    const result = Object.create(Options);
    result.transaction_options = this.transaction_options;
    if (opt instanceof RetryOptions) {
      result.retry_options = opt;
    } else if (opt.condition) {
      result.retry_options = this.retry_options.withRule(
        opt.condition,
        opt.attempts,
        opt.backoff
      );
    } else {
      const old = result.retry_options;
      result.retry_options = new RetryOptions(
        opt.attempts ?? old.attempts,
        opt.backoff ?? old.backoff
      );
    }
    return Object.freeze(result);
  }

  static defaults(): Options {
    return new Options();
  }
}
