# humanbytes

Turn byte sizes into readable text and back: `1536` to `'1.5 KB'`, and `'1.5 KB'` to `1536`.

[![npm version](https://img.shields.io/npm/v/humanbytes.svg)](https://www.npmjs.com/package/humanbytes) [![bundle size](https://img.shields.io/bundlephobia/minzip/humanbytes)](https://bundlephobia.com/package/humanbytes) [![license](https://img.shields.io/npm/l/humanbytes.svg)](LICENSE)

`humanbytes` reads size strings like `'10mb'` or `'2 GiB'` and returns the number of bytes. It also formats a number of bytes as text, like `'1.5 KB'`. Use it for upload limits, config values, download progress, file lists and logs. It can replace both `bytes` and `pretty-bytes`.

## Features

- **Both directions with one function**: give it a string to get bytes, give it a number to get text.
- **Every common unit style**: `KB` (1024), `kB` (1000), `KiB`, bits (`Mbit`), long names (`megabytes`), Kubernetes and Docker (`512Mi`, `2g`).
- **You choose what `KB` means**: 1024 bytes by default, like `bytes`, or 1000 bytes with `standard: 'si'`.
- **Correct rounding**: 1023.999 KB is shown as `'1 MB'`, not `'1024 KB'`.
- **Very large sizes**: up to yottabytes, and `bigint` in and out with no lost digits.
- **Typos are caught**: `humanbytes('10 MBs')` is a TypeScript error, and at runtime the error says *Did you mean 'MB'?*
- **Number formats for any language**: `{ locale: 'de' }` gives `'1,5 KB'`.
- **Zero dependencies**, about 2.5 KB gzipped, ESM and CommonJS, TypeScript types included.

## Installation

```sh
npm install humanbytes
```

```sh
pnpm add humanbytes
yarn add humanbytes
bun add humanbytes
```

## Quick start

```js
import humanbytes from 'humanbytes'

// String in, number of bytes out
humanbytes('1.5 KB')     // => 1536
humanbytes('10mb')       // => 10485760
humanbytes('2 GiB')      // => 2147483648

// Number in, readable text out
humanbytes(1536)         // => '1.5 KB'

// Choose the unit style and other options
humanbytes.format(1500, { standard: 'si' })   // => '1.5 kB'
humanbytes.format(1536, { standard: 'iec' })  // => '1.5 KiB'
humanbytes.format(1536, { long: true })       // => '1.5 kilobytes'
```

With CommonJS, use `const humanbytes = require('humanbytes')`. Named functions work too: `const { parse, format } = require('humanbytes')`.

## Table of contents

- [Usage](#usage)
- [API](#api)
- [Comparison](#comparison)
- [Migrating from other packages](#migrating-from-other-packages)
- [Notes and limitations](#notes-and-limitations)
- [Requirements](#requirements)
- [License](#license)

## Usage

### Choose what "KB" means

The same letters mean different sizes to different people. For example, some tools say 1 KB is 1024 bytes, and others say it is 1000 bytes. You pick the meaning with the `standard` option:

| `standard` | 1 KB is | Labels | Used by |
|---|---|---|---|
| `'jedec'` (default) | 1024 bytes | `KB`, `MB`, `GB` | Windows, RAM sizes, the `bytes` package |
| `'si'` | 1000 bytes | `kB`, `MB`, `GB` | Disk makers, macOS, `pretty-bytes` |
| `'iec'` | 1024 bytes | `KiB`, `MiB`, `GiB` | Linux tools, Kubernetes. These labels have only one meaning. |

```js
import { format, parse } from 'humanbytes'

format(1536)                          // => '1.5 KB'
format(1500, { standard: 'si' })      // => '1.5 kB'
format(1536, { standard: 'iec' })     // => '1.5 KiB'
```

The same option works when you parse:

- With `'jedec'`, `KB` and `kilobyte` mean 1024 bytes.
- With `'si'` or `'iec'`, `KB` and `kilobyte` mean 1000 bytes. Next to IEC units, that is the strict meaning of `KB`.
- IEC units like `KiB` and `kibibyte` always mean 1024 bytes, whatever the `standard`.

```js
parse('1 KB')                         // => 1024
parse('1 KB', { standard: 'si' })     // => 1000
parse('1 KB', { standard: 'iec' })    // => 1000
parse('1 KiB', { standard: 'si' })    // => 1024
```

Because of this, if you use the same options, `parse(format(n, options), options)` always gives back `n` (within the rounding of `format`).

### Parse a size string into bytes

`parse()` (or `humanbytes()` with a string) returns the number of bytes:

```js
import { parse } from 'humanbytes'

parse('1.5 KB')            // => 1536
parse('1.5kb')             // => 1536 (not case-sensitive, space is optional)
parse('1.5 KB', { standard: 'si' })  // => 1500
parse('2 GiB')             // => 2147483648 (IEC units are always 1024-based)
parse('512 bytes')         // => 512
parse('1.5 kilobytes')     // => 1536
parse('512Mi')             // => 536870912 (Kubernetes)
parse('2g')                // => 2147483648 (Docker, JVM)
parse('1,024 B')           // => 1024
parse('-1 KB')             // => -1024
parse('1024')              // => 1024 (a plain number means bytes)
parse(1024)                // => 1024 (numbers are returned unchanged)
```

Units are not case-sensitive. These are accepted:

| Kind | Spellings |
|---|---|
| Bytes | `B`, `byte`, `bytes` |
| Bits | `bit`, `bits` |
| Short units | `K`, `KB`, `Kbit`, `M`, `MB`, `Mbit`, and so on |
| Short IEC units | `Ki`, `KiB`, `Kibit`, `Mi`, `MiB`, `Mibit`, and so on |
| Long names | `kilobyte(s)`, `kilobit(s)`, `megabyte(s)`, and so on |
| Long IEC names | `kibibyte(s)`, `kibibit(s)`, `mebibyte(s)`, and so on |

The prefixes go from `k` (kilo, kibi) through `m`, `g`, `t`, `p`, `e`, `z` up to `y` (yotta, yobi).

The result is not rounded. `parse('1 bit')` is `0.125`. Use `Math.round()` if you need whole bytes.

### Format bytes as readable text

`format()` (or `humanbytes()` with a number) picks the best unit for you:

```js
import { format } from 'humanbytes'

format(1536)                                // => '1.5 KB'
format(1234567)                             // => '1.18 MB'
format(1234567, { decimals: 0 })            // => '1 MB'
format(1024, { fixedDecimals: true })       // => '1.00 KB'
format(1536, { unitSeparator: '' })         // => '1.5KB'
format(1536, { long: true })                // => '1.5 kilobytes'
format(1073741824, { unit: 'MB' })          // => '1024 MB'
format(1536, { signed: true })              // => '+1.5 KB'
format(-1536)                               // => '-1.5 KB'
format(1536, { locale: 'de' })              // => '1,5 KB'
format(1e9, { unit: 'KB', locale: 'en' })   // => '976,562.5 KB'
format('1.5 GiB', { standard: 'iec' })      // => '1.5 GiB' (strings are parsed first)
```

When a value rounds up to the next unit, it moves to that unit. `format(1048575)` is `'1 MB'`, not `'1024 KB'`.

### Work with bits and network speeds

By default, `b` and `B` both mean bytes. In a config file, `'10mb'` almost always means 10 megabytes. Units with `bit` in the name always mean bits.

```js
parse('100 Mbit', { standard: 'si' })     // => 12500000 (100 megabits in bytes)
parse('100 Mb')                           // => 104857600 (bytes)
```

For network speeds, where `Mb` means megabits, turn on `caseSensitive`. Then a lowercase `b` means bits and an uppercase `B` means bytes:

```js
parse('100 Mb', { caseSensitive: true })  // => 13107200 (megabits, 1024-based)
parse('100 MB', { caseSensitive: true })  // => 104857600 (bytes)
```

To show a size in bits, use `bits: true`. The input is still a number of bytes:

```js
format(1000, { bits: true })                     // => '7.81 Kbit'
format(125000, { bits: true, standard: 'si' })   // => '1 Mbit'
format(1, { bits: true, long: true })            // => '8 bits'
```

### Handle invalid input

Invalid input throws a `BytesError`. It does not return `null` or a wrong number. The message tells you what is wrong:

```js
import { parse, tryParse, isByteSize, BytesError } from 'humanbytes'

try {
  parse('10 MBs')
} catch (error) {
  error instanceof BytesError   // => true
  error.message                 // => "Unknown unit 'MBs' in byte size '10 MBs'. Did you mean 'MB'?"
  error.input                   // => '10 MBs'
}
```

If you prefer no exceptions, use `tryParse()` or `isByteSize()`:

```js
tryParse('nope')        // => undefined
tryParse('10mb')        // => 10485760
isByteSize('10mb')      // => true
isByteSize('10 parsecs') // => false
```

`NaN` and `Infinity` throw in both `parse()` and `format()`.

### Work with very large sizes

A JavaScript `number` is exact only up to `Number.MAX_SAFE_INTEGER` (about 8 PiB). Above that, use `bigint`.

`parseBigInt()` returns an exact whole number of bytes. It rounds half away from zero (`2.5` becomes `3`, `-2.5` becomes `-3`):

```js
import { parseBigInt, format } from 'humanbytes'

parseBigInt('16 EiB')   // => 18446744073709551616n
parseBigInt('1.5 YB')   // => 1813388729421943762059264n
parseBigInt(2.5)        // => 3n

format(2n ** 64n)       // => '16 EB'
format(2n ** 70n)       // => '1 ZB'
```

Sizes larger than yottabytes stay in `YB`: `format(2 ** 100)` is `'1048576 YB'`.

### Use TypeScript types

String literals are checked at compile time. Values typed as plain `string`, such as env vars or config values, are accepted and checked at runtime:

```ts
import humanbytes, { type ByteSize } from 'humanbytes'

humanbytes('10 MB')                   // OK
humanbytes('10 MBs')                  // compile error
humanbytes(process.env.MAX_UPLOAD!)   // OK, checked at runtime

interface Config { maxUpload: ByteSize }   // number | '10 MB' | ...
```

### Real-world examples

```js
import humanbytes, { format } from 'humanbytes'

// Body size limit from an env var, with a default
app.use(express.json({ limit: humanbytes(process.env.BODY_LIMIT ?? '1 MB') }))

// Upload limit
const MAX_UPLOAD = humanbytes('25 MB')
if (file.size > MAX_UPLOAD) throw new Error(`Max upload is ${format(MAX_UPLOAD)}`)

// Progress and size changes
console.log(`Downloaded ${format(received)} of ${format(total)}`)
console.log(`Bundle grew by ${format(after - before, { signed: true, standard: 'si' })}`)
```

## API

### humanbytes(input, options?)

```ts
function humanbytes(input: string, options?: ParseOptions): number
function humanbytes(input: number | bigint, options?: FormatOptions): string
```

The default export. A string is parsed, like `parse()`, and returns a number. A number or `bigint` is formatted, like `format()`, and returns a string.

The named functions are also attached to it: `humanbytes.parse`, `humanbytes.tryParse`, `humanbytes.parseBigInt`, `humanbytes.isByteSize`, `humanbytes.format` and `humanbytes.BytesError`.

### parse(input, options?)

```ts
function parse(input: string | number, options?: ParseOptions): number
```

Parses a size string and returns the number of bytes. Numbers are returned unchanged. Throws `BytesError` for invalid input, `NaN` and `Infinity`.

The result is not rounded. Above `Number.MAX_SAFE_INTEGER` (8 PiB), numbers lose precision. Use `parseBigInt()` for those.

| Option | Type | Default | Description |
|---|---|---|---|
| `standard` | `'jedec' \| 'si' \| 'iec'` | `'jedec'` | How to read `KB`, `MB`, `kilobyte`, `k` and similar. `'jedec'` means 1024. `'si'` and `'iec'` mean 1000. IEC units like `KiB` are always 1024. |
| `caseSensitive` | `boolean` | `false` | Read a lowercase `b` as bits: `'100 Mb'` is 100 megabits. `bit` and `bits` always mean bits. |

### tryParse(input, options?)

```ts
function tryParse(input: unknown, options?: ParseOptions): number | undefined
```

Like `parse()`, but returns `undefined` instead of throwing. Takes the same options.

### isByteSize(input, options?)

```ts
function isByteSize(input: unknown, options?: ParseOptions): input is ByteSize
```

Returns `true` if `parse()` would accept the value. Takes the same options.

### parseBigInt(input, options?)

```ts
function parseBigInt(input: string | number | bigint, options?: ParseOptions): bigint
```

Like `parse()`, but returns an exact whole number of bytes as a `bigint`. Rounds half away from zero. Accepts strings, numbers and bigints. Takes the same options as `parse()`.

### format(input, options?)

```ts
function format(input: number | bigint | string, options?: FormatOptions): string
```

Formats a number of bytes, a `bigint` or a size string as readable text. A string is parsed first. Throws `BytesError` for `NaN`, `Infinity`, values that are not numbers, and invalid options.

| Option | Type | Default | Description |
|---|---|---|---|
| `standard` | `'jedec' \| 'si' \| 'iec'` | `'jedec'` | `'jedec'` (1024, `KB`), `'si'` (1000, `kB`) or `'iec'` (1024, `KiB`). See [Choose what "KB" means](#choose-what-kb-means). |
| `decimals` | `number` | `2` | Maximum digits after the decimal point. A whole number from 0 to 20. |
| `fixedDecimals` | `boolean` | `false` | Keep trailing zeros: `'1.50 KB'`. |
| `unitSeparator` | `string` | `' '` | Text between the number and the unit. Use `''` for `'1.5KB'`. |
| `unit` | `Unit` | best fit | Always use this unit, for example `'MB'`, `'GiB'` or `'kbit'`. IEC units are always 1024-based. Bit units turn on `bits`. |
| `bits` | `boolean` | `false` | Show bits instead of bytes: `1000` gives `'7.81 Kbit'`. The input is still bytes. |
| `signed` | `boolean` | `false` | Add `+` before positive values. Useful for size changes. Zero never gets a sign. |
| `locale` | `string \| string[] \| boolean` | none | Format the number with `Intl.NumberFormat` for this locale. `true` uses the runtime's default locale. Unit labels are not translated. |
| `long` | `boolean` | `false` | Long unit names: `'1 kilobyte'`, `'1.5 kibibytes'`, `'8 bits'`. |

### BytesError

```ts
class BytesError extends TypeError {
  readonly input: unknown
}
```

Thrown for invalid input and invalid options. The bad value is in `error.input`. See [Handle invalid input](#handle-invalid-input).

### Types

All types are exported:

`Standard`, `Unit`, `ByteSize`, `ByteString`, `FormatOptions`, `ParseOptions`, `HumanBytes`, `CheckByteSize<T>`, `IsValidByteSize<T>`.

- `ByteSize`: a number of bytes or a size string. Use it to type config values.
- `ByteString`: the loose shape of a size string, such as `'10 MB'`.
- `Unit`: the unit labels accepted by the `unit` option of `format()`.
- `HumanBytes`: the type of the default export.
- `CheckByteSize<T>` and `IsValidByteSize<T>`: check a string literal type at compile time.

## Comparison

| | `bytes` | `pretty-bytes` | **humanbytes** |
|---|---|---|---|
| Format `1536` | `'1.5KB'` | `'1.54 kB'` | `'1.5 KB'` (or `'1.54 kB'` with `standard: 'si'`) |
| Parse `'1.5 KB'` | Yes | No (format only) | Yes |
| 1024-based (`KB`), 1000-based (`kB`), IEC (`KiB`) | 1024 only | 1000 or `KiB` | All three |
| Parse `'2 GiB'` | No (returns `2`) | No | Yes (`2147483648`) |
| Parse `'10 parsecs'` | No (returns `10`, no error) | No | Throws a clear error (or use `tryParse`) |
| Format 1023.999 KB | No (`'1024KB'`) | Yes (`'1 MB'`) | Yes (`'1 MB'`) |
| EB, ZB, YB | No (stops at PB) | Yes | Yes |
| `bigint` | No (returns `null`) | Format only | Format and parse, exact digits |
| Bits (`Mbit`) | No | Yes | Yes |
| Long names (`'1.5 kilobytes'`) | No | No | Yes |
| Number formats for a locale | No | Yes | Yes |
| CommonJS `require()` | Yes | No (ESM only) | Yes |
| TypeScript types | `@types/bytes` | Yes | Yes, built in, literals checked |

## Migrating from other packages

### From bytes

Before:

```js
bytes(1536)          // '1.5KB'
bytes.parse('1KB')   // 1024
```

After:

```js
humanbytes(1536, { unitSeparator: '' })   // => '1.5KB'
humanbytes('1KB')                         // => 1024
```

Differences:

- humanbytes puts a space between the number and the unit by default.
- humanbytes returns fractional bytes as they are. `bytes` rounds them down.
- humanbytes throws on invalid input. `bytes` returns `null`.

### From pretty-bytes

Before:

```js
prettyBytes(1536)                    // '1.54 kB'
prettyBytes(1536, { binary: true })  // '1.5 KiB'
```

After:

```js
humanbytes(1536, { standard: 'si' })    // => '1.54 kB'
humanbytes(1536, { standard: 'iec' })   // => '1.5 KiB'
```

## Notes and limitations

- **The default `KB` is 1024 bytes.** Use `standard: 'si'` if you want 1000, like disk makers and macOS.
- **`b` means bytes by default.** `'100 Mb'` is 100 megabytes unless you set `caseSensitive: true`.
- **`parse()` does not round.** `parse('1 bit')` is `0.125`. Use `Math.round()` for whole bytes.
- **Numbers above 8 PiB lose precision.** Use `parseBigInt()` and `bigint` input to `format()` for exact values.
- **YB is the largest unit.** Larger sizes are shown in `YB`, like `'1048576 YB'`.
- **Unit labels are not translated** by the `locale` option. Only the number format changes.
- **Typos are caught at compile time only for string literals.** Values typed as `string` are checked at runtime.
- **Size strings can be at most 100 characters long.** Longer strings throw a `BytesError`.

## Requirements

- Node.js 20 or newer. Also works in Bun, Deno and browsers.
- ESM and CommonJS.
- TypeScript types included.
- Zero dependencies.

## License

MIT
