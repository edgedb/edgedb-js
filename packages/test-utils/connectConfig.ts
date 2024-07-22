export const validTlsSecurityValues = [
  "insecure",
  "no_host_verification",
  "strict",
  "default",
] as const;

export type TlsSecurity = (typeof validTlsSecurityValues)[number];

// Converts value to number, or if value is NaN returns 0
// as defined in temporal spec:
// https://tc39.es/proposal-temporal/#sec-temporal-tointegerwithoutrounding
// Note: Split into two functions, since some places in the spec throw on
// non-integers and others use rounding
function toNumber(val: any): number {
  const n = Number(val);
  if (Number.isNaN(n)) {
    return 0;
  }
  return n;
}

function assertInteger(val: number): number {
  if (!Number.isInteger(val)) {
    throw new RangeError(`unsupported fractional value ${val}`);
  }
  return val;
}

const forwardJsonAsToString = (obj: object) => {
  Object.defineProperty(obj, "toJSON", {
    value: () => obj.toString(),
    enumerable: false,
    configurable: true,
  });
};

const throwOnValueOf = (obj: object, typename: string) => {
  Object.defineProperty(obj, "valueOf", {
    value: () => {
      throw new TypeError(`Not possible to compare ${typename}`);
    },
    enumerable: false,
    configurable: true,
  });
};

interface DurationLike {
  years?: number;
  months?: number;
  weeks?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;
  microseconds?: number;
  nanoseconds?: number;
}

const durationRegex = new RegExp(
  `^(\\-|\\+)?P(?:(\\d+)Y)?(?:(\\d+)M)?(?:(\\d+)W)?(?:(\\d+)D)?` +
    `(T(?:(\\d+)(\\.\\d{1,10})?H)?(?:(\\d+)(\\.\\d{1,10})?M)?` +
    `(?:(\\d+)(\\.\\d{1,9})?S)?)?$`,
  "i",
);

export class Duration {
  readonly years: number;
  readonly months: number;
  readonly weeks: number;
  readonly days: number;
  readonly hours: number;
  readonly minutes: number;
  readonly seconds: number;
  readonly milliseconds: number;
  readonly microseconds: number;
  readonly nanoseconds: number;
  readonly sign: number;

  constructor(
    years = 0,
    months = 0,
    weeks = 0,
    days = 0,
    hours = 0,
    minutes = 0,
    seconds = 0,
    milliseconds = 0,
    microseconds = 0,
    nanoseconds = 0,
  ) {
    years = assertInteger(toNumber(years));
    months = assertInteger(toNumber(months));
    weeks = assertInteger(toNumber(weeks));
    days = assertInteger(toNumber(days));
    hours = assertInteger(toNumber(hours));
    minutes = assertInteger(toNumber(minutes));
    seconds = assertInteger(toNumber(seconds));
    milliseconds = assertInteger(toNumber(milliseconds));
    microseconds = assertInteger(toNumber(microseconds));
    nanoseconds = assertInteger(toNumber(nanoseconds));

    const fields = [
      years,
      months,
      weeks,
      days,
      hours,
      minutes,
      seconds,
      milliseconds,
      microseconds,
      nanoseconds,
    ];

    let sign = 0;

    for (const field of fields) {
      if (field === Infinity || field === -Infinity) {
        throw new RangeError("infinite values not allowed as duration fields");
      }
      const fieldSign = Math.sign(field);
      if (sign && fieldSign && fieldSign !== sign) {
        throw new RangeError(
          "mixed-sign values not allowed as duration fields",
        );
      }
      sign = sign || fieldSign;
    }

    this.years = years || 0;
    this.months = months || 0;
    this.weeks = weeks || 0;
    this.days = days || 0;
    this.hours = hours || 0;
    this.minutes = minutes || 0;
    this.seconds = seconds || 0;
    this.milliseconds = milliseconds || 0;
    this.microseconds = microseconds || 0;
    this.nanoseconds = nanoseconds || 0;
    this.sign = sign || 0;

    forwardJsonAsToString(this);
    throwOnValueOf(this, "TemporalDuration");
  }

  get blank(): boolean {
    return this.sign === 0;
  }

  toString(): string {
    let dateParts = "";
    if (this.years) {
      dateParts += BigInt(Math.abs(this.years)) + "Y";
    }
    if (this.months) {
      dateParts += BigInt(Math.abs(this.months)) + "M";
    }
    if (this.weeks) {
      dateParts += BigInt(Math.abs(this.weeks)) + "W";
    }
    if (this.days) {
      dateParts += BigInt(Math.abs(this.days)) + "D";
    }

    let timeParts = "";
    if (this.hours) {
      timeParts += BigInt(Math.abs(this.hours)) + "H";
    }
    if (this.minutes) {
      timeParts += BigInt(Math.abs(this.minutes)) + "M";
    }
    if (
      (!dateParts && !timeParts) ||
      this.seconds ||
      this.milliseconds ||
      this.microseconds ||
      this.nanoseconds
    ) {
      const totalNanoseconds = (
        BigInt(Math.abs(this.seconds)) * BigInt(1e9) +
        BigInt(Math.abs(this.milliseconds)) * BigInt(1e6) +
        BigInt(Math.abs(this.microseconds)) * BigInt(1e3) +
        BigInt(Math.abs(this.nanoseconds))
      )
        .toString()
        .padStart(10, "0");

      const seconds = totalNanoseconds.slice(0, -9);
      const fracSeconds = totalNanoseconds.slice(-9).replace(/0+$/, "");

      timeParts +=
        seconds + (fracSeconds.length ? "." + fracSeconds : "") + "S";
    }

    return (
      (this.sign === -1 ? "-" : "") +
      "P" +
      dateParts +
      (timeParts ? "T" + timeParts : "")
    );
  }

  static from(item: string | Duration | DurationLike): Duration {
    let result: DurationLike;
    if (item instanceof Duration) {
      result = item;
    }

    if (typeof item === "object") {
      if (
        item.years === undefined &&
        item.months === undefined &&
        item.weeks === undefined &&
        item.days === undefined &&
        item.hours === undefined &&
        item.minutes === undefined &&
        item.seconds === undefined &&
        item.milliseconds === undefined &&
        item.microseconds === undefined &&
        item.nanoseconds === undefined
      ) {
        throw new TypeError(`invalid duration-like`);
      }
      result = item;
    } else {
      const str = String(item);
      const matches = str.match(durationRegex);
      if (!matches) {
        throw new RangeError(`invalid duration: ${str}`);
      }
      const [
        _duration,
        _sign,
        years,
        months,
        weeks,
        days,
        _time,
        hours,
        fHours,
        minutes,
        fMinutes,
        seconds,
        fSeconds,
      ] = matches;
      if (_duration.length < 3 || _time.length === 1) {
        throw new RangeError(`invalid duration: ${str}`);
      }
      const sign = _sign === "-" ? -1 : 1;
      result = {};
      if (years) {
        result.years = sign * Number(years);
      }
      if (months) {
        result.months = sign * Number(months);
      }
      if (weeks) {
        result.weeks = sign * Number(weeks);
      }
      if (days) {
        result.days = sign * Number(days);
      }
      if (hours) {
        result.hours = sign * Number(hours);
      }
      if (fHours) {
        if (minutes || fMinutes || seconds || fSeconds) {
          throw new RangeError("only the smallest unit can be fractional");
        }
        result.minutes = Number(fHours) * 60;
      } else {
        result.minutes = toNumber(minutes);
      }
      if (fMinutes) {
        if (seconds || fSeconds) {
          throw new RangeError("only the smallest unit can be fractional");
        }
        result.seconds = Number(fMinutes) * 60;
      } else if (seconds) {
        result.seconds = Number(seconds);
      } else {
        result.seconds = (result.minutes % 1) * 60;
      }
      if (fSeconds) {
        const ns = fSeconds.slice(1).padEnd(9, "0");
        result.milliseconds = Number(ns.slice(0, 3));
        result.microseconds = Number(ns.slice(3, 6));
        result.nanoseconds = sign * Number(ns.slice(6));
      } else {
        result.milliseconds = (result.seconds % 1) * 1000;
        result.microseconds = (result.milliseconds % 1) * 1000;
        result.nanoseconds =
          sign * Math.floor((result.microseconds % 1) * 1000);
      }

      result.minutes = sign * Math.floor(result.minutes);
      result.seconds = sign * Math.floor(result.seconds);
      result.milliseconds = sign * Math.floor(result.milliseconds);
      result.microseconds = sign * Math.floor(result.microseconds);
    }

    return new Duration(
      result.years,
      result.months,
      result.weeks,
      result.days,
      result.hours,
      result.minutes,
      result.seconds,
      result.milliseconds,
      result.microseconds,
      result.nanoseconds,
    );
  }
}

export interface ConnectConfig {
  dsn?: string;
  instanceName?: string;
  credentials?: string;
  credentialsFile?: string;
  host?: string;
  port?: number;
  database?: string;
  branch?: string;
  user?: string;
  password?: string;
  secretKey?: string;
  serverSettings?: any;
  tlsCA?: string;
  tlsCAFile?: string;
  tlsSecurity?: TlsSecurity;

  timeout?: number;
  waitUntilAvailable?: Duration | number;
  logging?: boolean;
}
