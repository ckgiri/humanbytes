/**
 * humanbytes — parse and format human-readable byte sizes.
 *
 *   humanbytes('1.5 KB')     // 1536
 *   humanbytes(1536)         // '1.5 KB'
 *   humanbytes.format(1536, { standard: 'iec' }) // '1.5 KiB'
 *   humanbytes.format(1500, { standard: 'si' })  // '1.5 kB'
 */

// ---------------------------------------------------------------------------
// Units
// ---------------------------------------------------------------------------

/**
 * Which units to use.
 *
 * - `'jedec'` (default): 1024-based with `KB`, `MB`, `GB` - what Windows, RAM sizes and the `bytes` package use.
 * - `'si'`: 1000-based with `kB`, `MB`, `GB` - what disk vendors, macOS and `pretty-bytes` use.
 * - `'iec'`: 1024-based with `KiB`, `MiB`, `GiB` - unambiguous binary units.
 */
export type Standard = 'jedec' | 'si' | 'iec';

type Upper = 'K' | 'M' | 'G' | 'T' | 'P' | 'E' | 'Z' | 'Y';

/** Canonical unit labels, accepted by the `unit` format option (case-insensitive at runtime). */
export type Unit = 'B' | 'kB' | `${Upper}B` | `${Upper}iB` | 'bit' | 'kbit' | `${Upper}bit` | `${Upper}ibit`;

const MAX_EXP = 8; // Y (yotta / yobi)
const STANDARDS: readonly Standard[] = ['jedec', 'si', 'iec'];
const PREFIX = ['', 'k', 'm', 'g', 't', 'p', 'e', 'z', 'y'];
const UPPER = ['', 'K', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y'];
const LONG_DEC = ['', 'kilo', 'mega', 'giga', 'tera', 'peta', 'exa', 'zetta', 'yotta'];
const LONG_BIN = ['', 'kibi', 'mebi', 'gibi', 'tebi', 'pebi', 'exbi', 'zebi', 'yobi'];

const label = (std: Standard, exp: number, bits: boolean): string => {
  const unit = bits ? 'bit' : 'B';
  if (exp === 0) return unit;
  if (std === 'iec') return `${UPPER[exp]}i${unit}`;
  return (std === 'si' && exp === 1 ? 'k' : UPPER[exp]) + unit;
};

const longLabel = (std: Standard, exp: number, bits: boolean, plural: boolean): string =>
  (std === 'iec' ? LONG_BIN : LONG_DEC)[exp]! + (bits ? 'bit' : 'byte') + (plural ? 's' : '');

interface UnitInfo {
  /** Power of the base: 0 = bytes, 1 = kilo/kibi, ... 8 = yotta/yobi. */
  exp: number;
  /** IEC unit (KiB, mebibyte): always 1024-based. Otherwise the base depends on the standard. */
  binary: boolean;
  bit: boolean;
  /** Short form ending in a single `b` ('kb', 'MiB'), which `caseSensitive` reads as bits when lowercase. */
  shortB: boolean;
}

const UNIT_TABLE = new Map<string, UnitInfo>();
{
  const add = (names: string[], exp: number, binary: boolean, bit: boolean, shortB = false) => {
    for (const name of names) UNIT_TABLE.set(name, { exp, binary, bit, shortB });
  };
  add(['b'], 0, false, false, true);
  add(['byte', 'bytes'], 0, false, false);
  add(['bit', 'bits'], 0, false, true);
  for (let e = 1; e <= MAX_EXP; e++) {
    const p = PREFIX[e]!;
    add([p, p + 'byte', p + 'bytes', LONG_DEC[e] + 'byte', LONG_DEC[e] + 'bytes'], e, false, false);
    add([p + 'b'], e, false, false, true);
    add([p + 'bit', p + 'bits', LONG_DEC[e] + 'bit', LONG_DEC[e] + 'bits'], e, false, true);
    add([p + 'i', LONG_BIN[e] + 'byte', LONG_BIN[e] + 'bytes'], e, true, false);
    add([p + 'ib'], e, true, false, true);
    add([p + 'ibit', p + 'ibits', LONG_BIN[e] + 'bit', LONG_BIN[e] + 'bits'], e, true, true);
  }
}

/** base ** exp as an exactly rounded double. */
const power = (base: number, exp: number): number => (base === 1024 ? 2 ** (10 * exp) : Number(`1e${3 * exp}`));

// ---------------------------------------------------------------------------
// Types that catch typos like '10 MBs' or '5 kilobites' at compile time
// ---------------------------------------------------------------------------

type P = 'k' | 'm' | 'g' | 't' | 'p' | 'e' | 'z' | 'y';
type LongPrefix =
  | 'kilo' | 'mega' | 'giga' | 'tera' | 'peta' | 'exa' | 'zetta' | 'yotta'
  | 'kibi' | 'mebi' | 'gibi' | 'tebi' | 'pebi' | 'exbi' | 'zebi' | 'yobi';
type LowerUnit =
  | 'b' | 'byte' | 'bytes' | 'bit' | 'bits'
  | `${P}${'' | 'b' | 'byte' | 'bytes' | 'bit' | 'bits' | 'i' | 'ib' | 'ibit' | 'ibits'}`
  | `${LongPrefix}${'byte' | 'bytes' | 'bit' | 'bits'}`;

type Trim<S extends string> = S extends ` ${infer R}` ? Trim<R> : S extends `${infer R} ` ? Trim<R> : S;
type NoCommas<S extends string> = S extends `${infer A},${infer B}` ? NoCommas<`${A}${B}`> : S;

/** Loose shape of a byte-size string, for typing config objects. */
export type ByteString = `${number}${string}` | `.${string}` | `-${string}` | `+${string}`;

/** Anything humanbytes accepts as a size: a number of bytes or a byte-size string. */
export type ByteSize = number | ByteString;

/** `true` if the string literal `S` is a valid byte size. */
export type IsValidByteSize<S extends string> =
  NoCommas<Lowercase<Trim<S>>> extends `${number}` | `${number}${LowerUnit}` | `${number} ${LowerUnit}` ? true : false;

/**
 * Literal strings are type-checked; values typed as plain `string`
 * (e.g. from env vars or config files) are accepted and checked at runtime.
 */
export type CheckByteSize<T extends string> = string extends T
  ? T
  : IsValidByteSize<T> extends true ? T : `Invalid byte size - use e.g. '1.5 KB', '512 MiB' or '10mb'`;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class BytesError extends TypeError {
  readonly input: unknown;
  constructor(message: string, input: unknown) {
    super(message);
    this.name = 'BytesError';
    this.input = input;
  }
}

const typeName = (v: unknown) => (v === null ? 'null' : typeof v);

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

export interface ParseOptions {
  /**
   * How to read units that could mean 1000 or 1024 (`KB`, `MB`, `kilobyte`, `k`, ...).
   * `'jedec'` (default) reads them as 1024-based, like the `bytes` package; `'si'` and `'iec'`
   * read them as 1000-based. IEC units (`KiB`, `MiB`, `mebibyte`, `Mi`) are always 1024-based.
   */
  standard?: Standard;
  /**
   * Read a lowercase `b` as bits and an uppercase `B` as bytes: `'100 Mb'` is 100 megabits.
   * Default `false`: `b` and `B` both mean bytes (`'10mb'` is 10 megabytes, like `bytes`).
   * `bit` / `bits` always mean bits.
   */
  caseSensitive?: boolean;
}

const SIZE = /^([+-]?)((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d*)?|\.\d+)(?:e([+-]?\d+))?\s*([a-z]*)$/i;
const MAX_INPUT = 100;

interface Parsed {
  negative: boolean;
  /** Decimal digits without the point, e.g. '15' for '1.5'. */
  digits: string;
  /** The value is digits * 10 ** pow10. */
  pow10: number;
  /** Unit prefix power: the value is multiplied by base ** exp. */
  exp: number;
  base: 1000 | 1024;
  bit: boolean;
}

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j]!;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length]!;
}

const SUGGESTIONS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'KiB', 'MiB', 'GiB', 'TiB', 'bit', 'kbit', 'Mbit', 'Gbit',
  'byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte', 'kibibyte', 'mebibyte', 'gibibyte', 'kilobit', 'megabit', 'gigabit'];

function suggestUnit(unit: string): string {
  let best = '';
  let bestScore = Infinity;
  for (const s of SUGGESTIONS) {
    const d = editDistance(unit.toLowerCase(), s.toLowerCase());
    if (d < bestScore) {
      bestScore = d;
      best = s;
    }
  }
  return bestScore <= 2 ? ` Did you mean '${best}'?` : '';
}

function checkStandard(standard: unknown): Standard {
  if (standard === undefined) return 'jedec';
  if (!STANDARDS.includes(standard as Standard)) {
    throw new BytesError(`Unknown standard '${String(standard)}'. Use 'jedec', 'si' or 'iec'.`, standard);
  }
  return standard as Standard;
}

function tokenize(input: string, options: ParseOptions): Parsed {
  const str = input.trim();
  if (str === '') throw new BytesError('Cannot parse an empty string as a byte size.', input);
  if (str.length > MAX_INPUT) throw new BytesError(`Byte size string is too long (max ${MAX_INPUT} characters).`, input);
  const standard = checkStandard(options.standard);
  const m = SIZE.exec(str);
  if (!m) {
    throw new BytesError(`Invalid byte size: '${input}'. Expected something like '1.5 KB', '512 MiB' or '10mb'.`, input);
  }
  const unitText = m[4]!;
  let info: UnitInfo = { exp: 0, binary: false, bit: false, shortB: false };
  if (unitText) {
    const found = UNIT_TABLE.get(unitText.toLowerCase());
    if (!found) throw new BytesError(`Unknown unit '${unitText}' in byte size '${input}'.${suggestUnit(unitText)}`, input);
    info = found;
  }
  const num = m[2]!.replace(/,/g, '');
  const dot = num.indexOf('.');
  const digits = dot < 0 ? num : num.slice(0, dot) + num.slice(dot + 1);
  const fraction = dot < 0 ? 0 : num.length - dot - 1;
  return {
    negative: m[1] === '-',
    digits,
    pow10: Number(m[3] ?? 0) - fraction,
    exp: info.exp,
    base: info.binary || standard === 'jedec' ? 1024 : 1000,
    bit: info.bit || (!!options.caseSensitive && info.shortB && unitText.endsWith('b')),
  };
}

function parseString(input: string, options: ParseOptions = {}): number {
  const t = tokenize(input, options);
  // Decimal prefixes are applied as a power of ten so '1.1 MB' (SI) is exactly 1100000.
  const pow10 = t.pow10 + (t.base === 1000 ? 3 * t.exp : 0);
  let value = Number(`${t.digits}e${pow10}`);
  if (t.base === 1024) value *= power(1024, t.exp);
  if (t.bit) value /= 8;
  if (!Number.isFinite(value)) throw new BytesError(`Byte size is out of range: '${input}'.`, input);
  return (t.negative ? -value : value) + 0; // `+ 0` turns -0 into 0
}

function assertString(input: unknown): string {
  if (typeof input !== 'string') {
    throw new BytesError(`Byte size must be a string or number, got ${typeName(input)}.`, input);
  }
  return input;
}

/**
 * Parse a byte size into a number of bytes. Numbers are returned unchanged.
 * Throws a `BytesError` with a helpful message on invalid input.
 *
 *   parse('1.5 KB')    // 1536
 *   parse('2 GiB')     // 2147483648
 *   parse('10mb')      // 10485760
 *   parse('1.5 KB', { standard: 'si' }) // 1500
 *
 * The result is not rounded: `parse('1 bit')` is `0.125`. Use `Math.round` if you need whole bytes,
 * or `parseBigInt` for sizes above `Number.MAX_SAFE_INTEGER` (8 PiB).
 */
export function parse<T extends string | number>(input: T extends string ? CheckByteSize<T> : T, options?: ParseOptions): number {
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) throw new BytesError(`Byte size must be a finite number, got ${input}.`, input);
    return input;
  }
  return parseString(assertString(input), options);
}

/** Like `parse`, but returns `undefined` instead of throwing. */
export function tryParse(input: unknown, options?: ParseOptions): number | undefined {
  try {
    return parse(input as string, options);
  } catch {
    return undefined;
  }
}

/** `true` if the value can be parsed as a byte size. */
export function isByteSize(input: unknown, options?: ParseOptions): input is ByteSize {
  return tryParse(input, options) !== undefined;
}

/**
 * Parse a byte size into an exact whole number of bytes as a `bigint`, rounding half away from zero.
 * Use it for sizes above `Number.MAX_SAFE_INTEGER` (8 PiB), where `parse` loses precision.
 *
 *   parseBigInt('16 EiB')  // 18446744073709551616n
 *   parseBigInt('1.5 YB')  // 1813388729421943762059264n
 */
export function parseBigInt<T extends string | number | bigint>(
  input: T extends string ? CheckByteSize<T> : T,
  options?: ParseOptions,
): bigint {
  if (typeof input === 'bigint') return input;
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) throw new BytesError(`Byte size must be a finite number, got ${input}.`, input);
    return BigInt(Math.sign(input) * Math.round(Math.abs(input)));
  }
  const str = assertString(input);
  const t = tokenize(str, options ?? {});
  if (t.pow10 > 1000) throw new BytesError(`Byte size is out of range: '${str}'.`, str);
  if (t.pow10 < -1000) return 0n;
  let num = BigInt(t.digits) * BigInt(t.base) ** BigInt(t.exp);
  let den = t.bit ? 8n : 1n;
  if (t.pow10 >= 0) num *= 10n ** BigInt(t.pow10);
  else den *= 10n ** BigInt(-t.pow10);
  const result = (2n * num + den) / (2n * den);
  return t.negative ? -result : result;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export interface FormatOptions {
  /**
   * `'jedec'` (default): 1024-based, `KB`, `MB` (1536 => '1.5 KB').
   * `'si'`: 1000-based, `kB`, `MB` (1500 => '1.5 kB').
   * `'iec'`: 1024-based, `KiB`, `MiB` (1536 => '1.5 KiB').
   */
  standard?: Standard;
  /** Maximum digits after the decimal point. Default `2`. */
  decimals?: number;
  /** Always show `decimals` digits, keeping trailing zeros: '1.50 KB'. Default `false`. */
  fixedDecimals?: boolean;
  /** Text between the number and the unit. Default `' '`; use `''` for '1.5KB'. */
  unitSeparator?: string;
  /**
   * Always use this unit instead of picking the best one: `format(524288, { unit: 'MB' })` => '0.5 MB'.
   * IEC units (`'MiB'`) are always 1024-based, other units follow `standard`. Bit units imply `bits`.
   */
  unit?: Unit;
  /** Show bits instead of bytes (the value is still bytes): 1000 => '7.81 Kbit'. Default `false`. */
  bits?: boolean;
  /** Show a `+` for positive values, e.g. for size differences. Default `false`. */
  signed?: boolean;
  /**
   * Format the number with `Intl.NumberFormat` for a locale, e.g. 'de' => '1,5 KB'.
   * `true` uses the runtime's default locale. Unit labels are not translated.
   */
  locale?: string | readonly string[] | boolean;
  /** Use long unit names: '1.5 kilobytes', '1 kibibyte', '8 bits'. Default `false`. */
  long?: boolean;
}

function checkDecimals(decimals: unknown): number {
  if (decimals === undefined) return 2;
  if (typeof decimals !== 'number' || !Number.isInteger(decimals) || decimals < 0 || decimals > 20) {
    throw new BytesError(`'decimals' must be a whole number from 0 to 20, got ${String(decimals)}.`, decimals);
  }
  return decimals;
}

const round = (value: number, decimals: number): number => Number(value.toFixed(decimals));

/**
 * Format a number of bytes (or a `bigint`, or a byte-size string) as readable text.
 *
 *   format(1536)                          // '1.5 KB'
 *   format(1536, { standard: 'iec' })     // '1.5 KiB'
 *   format(1500, { standard: 'si' })      // '1.5 kB'
 *   format(1536, { long: true })          // '1.5 kilobytes'
 *   format(125000, { bits: true, standard: 'si' }) // '1 Mbit'
 *   format(2n ** 70n)                     // '1 ZB'
 */
export function format(input: number | bigint | string, options: FormatOptions = {}): string {
  let standard = checkStandard(options.standard);
  const decimals = checkDecimals(options.decimals);
  let bits = !!options.bits;
  let forced: number | undefined;
  if (options.unit !== undefined) {
    const info = typeof options.unit === 'string' ? UNIT_TABLE.get(options.unit.toLowerCase()) : undefined;
    if (!info) throw new BytesError(`Unknown unit '${String(options.unit)}' in format options.`, options.unit);
    forced = info.exp;
    if (info.bit) bits = true;
    if (info.binary) standard = 'iec';
    else if (standard === 'iec' && info.exp > 0) standard = 'si'; // 'MB' next to IEC units means 1000-based
  }
  const base = standard === 'si' ? 1000 : 1024;

  let negative: boolean;
  let exp: number;
  let value: number;
  // A whole bigint too big for a double keeps every digit, e.g. with `unit: 'B'`: '18446744073709551615 B'
  let exact: bigint | undefined;
  if (typeof input === 'bigint') {
    negative = input < 0n;
    let n = negative ? -input : input;
    if (bits) n *= 8n;
    const big = BigInt(base);
    exp = forced ?? 0;
    if (forced === undefined) while (exp < MAX_EXP && n >= big ** BigInt(exp + 1)) exp++;
    const size = big ** BigInt(exp);
    value = Number(n / size) + Number(n % size) / Number(size);
    if (n % size === 0n && n / size > BigInt(Number.MAX_SAFE_INTEGER)) exact = n / size;
  } else {
    const n = typeof input === 'string' ? parseString(input, { standard }) : input;
    if (typeof n !== 'number') {
      throw new BytesError(`Byte size must be a number, bigint or string, got ${typeName(n)}.`, input);
    }
    if (!Number.isFinite(n)) throw new BytesError(`Byte size must be a finite number, got ${n}.`, input);
    negative = n < 0;
    const abs = Math.abs(n) * (bits ? 8 : 1);
    exp = forced ?? 0;
    if (forced === undefined) while (exp < MAX_EXP && abs >= power(base, exp + 1)) exp++;
    value = abs / power(base, exp);
  }
  if (!Number.isFinite(value)) throw new BytesError('Byte size is too large to format.', input);

  let rounded = round(value, decimals);
  // 1023.999 KB rounds to 1024 KB => show '1 MB' instead
  if (forced === undefined && rounded >= base && exp < MAX_EXP) {
    exp++;
    exact = undefined;
    rounded = round(value / base, decimals);
  }

  const fixed = !!options.fixedDecimals;
  let text: string;
  if (options.locale !== undefined && options.locale !== false) {
    const locale = options.locale === true ? undefined : (options.locale as string | string[]);
    text = new Intl.NumberFormat(locale, {
      minimumFractionDigits: fixed ? decimals : 0,
      maximumFractionDigits: decimals,
    }).format(exact ?? rounded);
  } else if (exact !== undefined) {
    text = String(exact) + (fixed && decimals > 0 ? '.' + '0'.repeat(decimals) : '');
  } else {
    // toFixed avoids exponents for small values ('0.0000000009', not '9e-10')
    text = rounded.toFixed(decimals);
    if (!fixed && text.includes('.') && !text.includes('e')) text = text.replace(/\.?0+$/, '');
  }

  const sign = rounded === 0 ? '' : negative ? '-' : options.signed ? '+' : '';
  const unit = options.long
    ? longLabel(standard, exp, bits, !(rounded === 1 && !(fixed && decimals > 0)))
    : label(standard, exp, bits);
  return sign + text + (options.unitSeparator ?? ' ') + unit;
}

// ---------------------------------------------------------------------------
// Default export: humanbytes('1.5 KB') => 1536, humanbytes(1536) => '1.5 KB'
// ---------------------------------------------------------------------------

export interface HumanBytes {
  /** Parse a byte-size string into a number of bytes. */
  <T extends string>(input: CheckByteSize<T>, options?: ParseOptions): number;
  /** Format a number of bytes as a readable string. */
  (input: number | bigint, options?: FormatOptions): string;
  parse: typeof parse;
  tryParse: typeof tryParse;
  parseBigInt: typeof parseBigInt;
  isByteSize: typeof isByteSize;
  format: typeof format;
  BytesError: typeof BytesError;
}

const humanbytes = ((input: unknown, options?: FormatOptions & ParseOptions) =>
  typeof input === 'number' || typeof input === 'bigint'
    ? format(input, options)
    : parseString(assertString(input), options)) as HumanBytes;

Object.assign(humanbytes, { parse, tryParse, parseBigInt, isByteSize, format, BytesError });

export default humanbytes;
