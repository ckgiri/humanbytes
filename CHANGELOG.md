# Changelog

All notable changes to this package are documented here. This project follows [Semantic Versioning](https://semver.org/).

## 1.3.0 - Unreleased

Package metadata only. No code or behavior changes.

- `homepage` in `package.json` now points to the npm page: https://www.npmjs.com/package/humanbytes.

## 1.2.0 - Unreleased

Documentation only. No code or behavior changes.

- Rewrote the README: plain wording, a full API reference with options tables, and examples that are checked against the build.
- Fixed type doc comments shown in editors: the `unit` and bigint examples say which input they use.
- Package metadata: author, funding link, homepage, repository and issue tracker in `package.json`, and the copyright holder in `LICENSE`.

## 1.0.0 - 2026-11-24

First release.

- `humanbytes()` parses strings and formats numbers: `humanbytes('1.5 KB')` => `1536`, `humanbytes(1536)` => `'1.5 KB'`.
- `format()` with three standards: `'jedec'` (1024, `KB`, default), `'si'` (1000, `kB`) and `'iec'` (1024, `KiB`).
- Format options: `decimals`, `fixedDecimals`, `unitSeparator`, `unit`, `bits`, `signed`, `locale` (via `Intl.NumberFormat`) and `long` names.
- Rounds across unit boundaries (`1023.999 KB` => `'1 MB'`), up to yottabytes, and formats `bigint` without losing digits.
- `parse()` reads every unit style case-insensitively: `KB`, `kB`, `KiB`, `K`, `Ki`, bits, long names, thousands separators. `standard` decides whether `KB` is 1000 or 1024; `caseSensitive` reads `Mb` as megabits.
- `parseBigInt()` for exact sizes above 8 PiB, `tryParse()`, `isByteSize()`.
- Invalid input throws a `BytesError` with a helpful message (*Did you mean 'MB'?*).
- Typed string literals: typos like `'10 MBs'` are compile errors.
- ESM + CommonJS, zero dependencies.
