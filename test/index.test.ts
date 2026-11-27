import { describe, expect, it, expectTypeOf } from 'vitest';
import humanbytes, {
  format, parse, tryParse, parseBigInt, isByteSize, BytesError,
  type ByteSize, type FormatOptions, type Standard,
} from '../src/index';

const KB = 1024;
const MB = 1024 ** 2;
const GB = 1024 ** 3;

describe('default export', () => {
  it('parses strings and formats numbers', () => {
    expect(humanbytes('1.5 KB')).toBe(1536);
    expect(humanbytes(1536)).toBe('1.5 KB');
    expect(humanbytes(2n ** 30n)).toBe('1 GB');
    expect(humanbytes('1.5 KB', { standard: 'si' })).toBe(1500);
    expect(humanbytes(1536, { standard: 'iec' })).toBe('1.5 KiB');
  });

  it('has the named functions attached', () => {
    expect(humanbytes.parse('1 KB')).toBe(1024);
    expect(humanbytes.format(1024)).toBe('1 KB');
    expect(humanbytes.tryParse('x')).toBeUndefined();
    expect(humanbytes.parseBigInt('1 KB')).toBe(1024n);
    expect(humanbytes.isByteSize('1 KB')).toBe(true);
    expect(humanbytes.BytesError).toBe(BytesError);
  });

  it('rejects other input types', () => {
    expect(() => humanbytes(null as unknown as string)).toThrow(/got null/);
    expect(() => humanbytes({} as unknown as string)).toThrow(BytesError);
  });
});

describe('parse', () => {
  it('parses JEDEC units as 1024-based by default (like `bytes`)', () => {
    expect(parse('1 B')).toBe(1);
    expect(parse('1 KB')).toBe(KB);
    expect(parse('1.5 KB')).toBe(1536);
    expect(parse('10MB')).toBe(10 * MB);
    expect(parse('2 GB')).toBe(2 * GB);
    expect(parse('1 TB')).toBe(1024 ** 4);
    expect(parse('1 PB')).toBe(1024 ** 5);
    expect(parse('1 EB')).toBe(1024 ** 6);
    expect(parse('1 ZB')).toBe(1024 ** 7);
    expect(parse('1 YB')).toBe(1024 ** 8);
  });

  it('is case-insensitive', () => {
    for (const s of ['1.5kb', '1.5KB', '1.5Kb', '1.5kB', '1.5 kb']) expect(parse(s)).toBe(1536);
    expect(parse('10mb')).toBe(10 * MB);
    expect(parse('2 gib')).toBe(2 * GB);
    expect(parse('1 KILOBYTE')).toBe(KB);
  });

  it('reads ambiguous units as 1000-based with standard: si or iec', () => {
    expect(parse('1.5 KB', { standard: 'si' })).toBe(1500);
    expect(parse('1.5 kB', { standard: 'si' })).toBe(1500);
    expect(parse('1.1 MB', { standard: 'si' })).toBe(1_100_000);
    expect(parse('1 GB', { standard: 'iec' })).toBe(1e9);
    expect(parse('1 kilobyte', { standard: 'si' })).toBe(1000);
    expect(parse('1 YB', { standard: 'si' })).toBe(1e24);
  });

  it('always reads IEC units as 1024-based', () => {
    for (const standard of ['jedec', 'si', 'iec'] as Standard[]) {
      expect(parse('1 KiB', { standard })).toBe(KB);
      expect(parse('2 GiB', { standard })).toBe(2 * GB);
      expect(parse('1 mebibyte', { standard })).toBe(MB);
      expect(parse('1 YiB', { standard })).toBe(1024 ** 8);
    }
  });

  it('parses long names, singular and plural', () => {
    expect(parse('512 bytes')).toBe(512);
    expect(parse('1 byte')).toBe(1);
    expect(parse('1.5 kilobytes')).toBe(1536);
    expect(parse('3 megabytes')).toBe(3 * MB);
    expect(parse('1 gibibyte')).toBe(GB);
    expect(parse('2 tebibytes')).toBe(2 * 1024 ** 4);
    expect(parse('1 exbibyte')).toBe(1024 ** 6);
    expect(parse('1 zettabyte', { standard: 'si' })).toBe(1e21);
  });

  it('parses bits', () => {
    expect(parse('8 bits')).toBe(1);
    expect(parse('1 bit')).toBe(0.125);
    expect(parse('8 Kbit')).toBe(KB);
    expect(parse('8 kbit', { standard: 'si' })).toBe(1000);
    expect(parse('100 Mbit', { standard: 'si' })).toBe(12_500_000);
    expect(parse('8 Mibit')).toBe(MB);
    expect(parse('8 megabits', { standard: 'si' })).toBe(1e6);
    expect(parse('8 kibibits')).toBe(KB);
  });

  it('reads lowercase b as bits only with caseSensitive', () => {
    expect(parse('100 Mb')).toBe(100 * MB);
    expect(parse('100 Mb', { caseSensitive: true })).toBe(100 * MB / 8);
    expect(parse('100 MB', { caseSensitive: true })).toBe(100 * MB);
    expect(parse('100 mb', { caseSensitive: true, standard: 'si' })).toBe(12_500_000);
    expect(parse('8 b', { caseSensitive: true })).toBe(1);
    expect(parse('8 B', { caseSensitive: true })).toBe(8);
    expect(parse('8 Mib', { caseSensitive: true })).toBe(MB);
    expect(parse('8 MiB', { caseSensitive: true })).toBe(8 * MB);
    expect(parse('1 kilobyte', { caseSensitive: true })).toBe(KB);
  });

  it('accepts bare prefixes and Kubernetes-style suffixes', () => {
    expect(parse('512k')).toBe(512 * KB);
    expect(parse('512M')).toBe(512 * MB);
    expect(parse('2g')).toBe(2 * GB);
    expect(parse('512Mi')).toBe(512 * MB);
    expect(parse('1Gi', { standard: 'si' })).toBe(GB);
    expect(parse('500M', { standard: 'si' })).toBe(500e6);
    expect(parse('1 kbyte')).toBe(KB);
  });

  it('parses number formats', () => {
    expect(parse('1,024 B')).toBe(1024);
    expect(parse('1,048,576')).toBe(MB);
    expect(parse('1,234.5 KB')).toBe(1234.5 * KB);
    expect(parse('.5 KB')).toBe(512);
    expect(parse('1. KB')).toBe(KB);
    expect(parse('1e3')).toBe(1000);
    expect(parse('1e3 KB')).toBe(1000 * KB);
    expect(parse('1E-3 KB')).toBe(1.024);
    expect(parse('  10 MB  ')).toBe(10 * MB);
    expect(parse('10    MB')).toBe(10 * MB);
    expect(parse('1eb')).toBe(1024 ** 6); // exabytes, not an exponent
  });

  it('handles signs and zero', () => {
    expect(parse('-1 KB')).toBe(-KB);
    expect(parse('+1 KB')).toBe(KB);
    expect(Object.is(parse('-0 KB'), 0)).toBe(true);
    expect(parse('0')).toBe(0);
    expect(parse('0 B')).toBe(0);
  });

  it('passes plain numbers through', () => {
    expect(parse('1024')).toBe(1024);
    expect(parse('1.5')).toBe(1.5);
    expect(parse(1536)).toBe(1536);
    expect(parse(-5)).toBe(-5);
    expect(parse(0.5)).toBe(0.5);
  });

  it('does not round fractional bytes', () => {
    expect(parse('1.1 KB')).toBe(1126.4);
    expect(parse('0.5 B')).toBe(0.5);
  });

  it('throws helpful errors on invalid input (like durationly)', () => {
    expect(() => parse('' as string)).toThrow(/empty/);
    expect(() => parse('   ' as string)).toThrow(/empty/);
    expect(() => parse('abc' as string)).toThrow(/Invalid byte size/);
    expect(() => parse('KB' as string)).toThrow(/Invalid byte size/);
    expect(() => parse('1 2 KB' as string)).toThrow(BytesError);
    expect(() => parse('1,5 KB' as string)).toThrow(/Invalid byte size/);
    expect(() => parse('1,0000 KB' as string)).toThrow(BytesError);
    expect(() => parse('10 MBs' as string)).toThrow(/Unknown unit 'MBs'.*Did you mean 'MB'/);
    expect(() => parse('5 kilobites' as string)).toThrow(/Did you mean 'kilobyte'/);
    expect(() => parse('5 parsecs' as string)).toThrow(/Unknown unit 'parsecs'/);
    expect(() => parse('5 parsecs' as string)).not.toThrow(/Did you mean/);
    expect(() => parse('1 KB extra' as string)).toThrow(BytesError);
    expect(() => parse('1e999 B' as string)).toThrow(/out of range/);
    expect(() => parse('1'.repeat(101) as string)).toThrow(/too long/);
    expect(() => parse(NaN)).toThrow(/finite/);
    expect(() => parse(Infinity)).toThrow(/finite/);
    expect(() => parse(null as unknown as string)).toThrow(/got null/);
    expect(() => parse(undefined as unknown as string)).toThrow(/got undefined/);
    expect(() => parse('1 KB', { standard: 'binary' as Standard })).toThrow(/Unknown standard/);
  });

  it('attaches the input to the error', () => {
    try {
      parse('nope' as string);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(BytesError);
      expect(e).toBeInstanceOf(TypeError);
      expect((e as BytesError).name).toBe('BytesError');
      expect((e as BytesError).input).toBe('nope');
    }
  });

  it('tryParse and isByteSize never throw', () => {
    expect(tryParse('1 KB')).toBe(1024);
    expect(tryParse('1 KB', { standard: 'si' })).toBe(1000);
    expect(tryParse('nope')).toBeUndefined();
    expect(tryParse({})).toBeUndefined();
    expect(tryParse(NaN)).toBeUndefined();
    expect(isByteSize('10mb')).toBe(true);
    expect(isByteSize(12)).toBe(true);
    expect(isByteSize('10 parsecs')).toBe(false);
    expect(isByteSize(undefined)).toBe(false);
  });
});

describe('parseBigInt', () => {
  it('parses exactly beyond Number.MAX_SAFE_INTEGER', () => {
    expect(parseBigInt('16 EiB')).toBe(2n ** 64n);
    expect(parseBigInt('1 YB')).toBe(2n ** 80n);
    expect(parseBigInt('1.5 YB')).toBe(3n * 2n ** 79n);
    expect(parseBigInt('1 YB', { standard: 'si' })).toBe(10n ** 24n);
    expect(parseBigInt('1.1 YB', { standard: 'si' })).toBe(11n * 10n ** 23n);
    expect(parseBigInt('123,456,789,012,345,678,901 B')).toBe(123456789012345678901n);
    expect(parseBigInt('1e30')).toBe(10n ** 30n);
  });

  it('rounds to whole bytes, half away from zero', () => {
    expect(parseBigInt('1.1 KB')).toBe(1126n); // 1126.4
    expect(parseBigInt('0.5 B')).toBe(1n);
    expect(parseBigInt('-0.5 B')).toBe(-1n);
    expect(parseBigInt('0.49 B')).toBe(0n);
    expect(parseBigInt('1 bit')).toBe(0n);
    expect(parseBigInt('4 bits')).toBe(1n);
    expect(parseBigInt('1e-2000 KB')).toBe(0n);
  });

  it('handles the same units and options as parse', () => {
    expect(parseBigInt('100 Mb', { caseSensitive: true })).toBe(13107200n);
    expect(parseBigInt('2 gibibytes')).toBe(2n * 2n ** 30n);
    expect(parseBigInt('-1 KB')).toBe(-1024n);
  });

  it('passes numbers and bigints through', () => {
    expect(parseBigInt(10n)).toBe(10n);
    expect(parseBigInt(1536)).toBe(1536n);
    expect(parseBigInt(2.5)).toBe(3n);
    expect(parseBigInt(-2.5)).toBe(-3n);
    expect(() => parseBigInt(NaN)).toThrow(/finite/);
    expect(() => parseBigInt('nope' as string)).toThrow(BytesError);
    expect(() => parseBigInt('1e2000 B' as string)).toThrow(/out of range/);
  });
});

describe('format', () => {
  it('uses 1024-based JEDEC units by default', () => {
    expect(format(0)).toBe('0 B');
    expect(format(1)).toBe('1 B');
    expect(format(1023)).toBe('1023 B');
    expect(format(1024)).toBe('1 KB');
    expect(format(1536)).toBe('1.5 KB');
    expect(format(10 * MB)).toBe('10 MB');
    expect(format(1.25 * GB)).toBe('1.25 GB');
    expect(format(1024 ** 4)).toBe('1 TB');
    expect(format(1024 ** 5)).toBe('1 PB');
    expect(format(1024 ** 6)).toBe('1 EB');
    expect(format(1024 ** 7)).toBe('1 ZB');
    expect(format(1024 ** 8)).toBe('1 YB');
    expect(format(1234567)).toBe('1.18 MB');
  });

  it('supports SI (1000-based) units', () => {
    const si: FormatOptions = { standard: 'si' };
    expect(format(999, si)).toBe('999 B');
    expect(format(1000, si)).toBe('1 kB');
    expect(format(1500, si)).toBe('1.5 kB');
    expect(format(1536, si)).toBe('1.54 kB');
    expect(format(1e6, si)).toBe('1 MB');
    expect(format(1e9, si)).toBe('1 GB');
    expect(format(1e24, si)).toBe('1 YB');
  });

  it('supports IEC units', () => {
    const iec: FormatOptions = { standard: 'iec' };
    expect(format(1023, iec)).toBe('1023 B');
    expect(format(1536, iec)).toBe('1.5 KiB');
    expect(format(MB, iec)).toBe('1 MiB');
    expect(format(5 * GB, iec)).toBe('5 GiB');
    expect(format(1024 ** 8, iec)).toBe('1 YiB');
  });

  it('rounds up across unit boundaries', () => {
    expect(format(1023.999 * KB)).toBe('1 MB');
    expect(format(1023.99 * KB)).toBe('1023.99 KB');
    expect(format(1023.99 * KB, { decimals: 1 })).toBe('1 MB');
    expect(format(1023.6, { decimals: 0 })).toBe('1 KB');
    expect(format(999_999, { standard: 'si' })).toBe('1 MB');
    expect(format(999_999, { standard: 'si', decimals: 3 })).toBe('999.999 kB');
    expect(format(1024 ** 2 - 1, { standard: 'iec' })).toBe('1 MiB');
    expect(format(-(1023.999 * KB))).toBe('-1 MB');
    expect(format(2n ** 20n - 1n)).toBe('1 MB');
    // never past the largest unit
    expect(format(1024 ** 9 - 1)).toBe('1024 YB');
  });

  it('controls decimals', () => {
    expect(format(1234567, { decimals: 0 })).toBe('1 MB');
    expect(format(1234567, { decimals: 1 })).toBe('1.2 MB');
    expect(format(1234567, { decimals: 4 })).toBe('1.1774 MB');
    expect(format(1536, { decimals: 3 })).toBe('1.5 KB');
    expect(format(1536, { decimals: 3, fixedDecimals: true })).toBe('1.500 KB');
    expect(format(1024, { fixedDecimals: true })).toBe('1.00 KB');
    expect(format(1024, { fixedDecimals: true, decimals: 0 })).toBe('1 KB');
    expect(() => format(1, { decimals: -1 })).toThrow(/decimals/);
    expect(() => format(1, { decimals: 1.5 })).toThrow(/decimals/);
    expect(() => format(1, { decimals: 21 })).toThrow(/decimals/);
  });

  it('controls the unit separator', () => {
    expect(format(1536, { unitSeparator: '' })).toBe('1.5KB');
    expect(format(1536, { unitSeparator: ' ' })).toBe('1.5 KB');
    expect(format(1536, { unitSeparator: '', long: true })).toBe('1.5kilobytes');
  });

  it('can force a unit', () => {
    expect(format(512 * KB, { unit: 'MB' })).toBe('0.5 MB');
    expect(format(GB, { unit: 'MB' })).toBe('1024 MB');
    expect(format(1024 * KB, { unit: 'KB' })).toBe('1024 KB');
    expect(format(1500, { unit: 'B' })).toBe('1500 B');
    expect(format(1, { unit: 'GB' })).toBe('0 GB');
    expect(format(1, { unit: 'GB', decimals: 10 })).toBe('0.0000000009 GB');
    expect(format(1.5e6, { unit: 'kB', standard: 'si' })).toBe('1500 kB');
    expect(format(GB, { unit: 'GB', standard: 'si' })).toBe('1.07 GB');
    expect(format(1e9, { unit: 'MB', locale: 'en' })).toBe('953.67 MB');
    expect(format(1e9, { unit: 'KB', locale: 'en' })).toBe('976,562.5 KB');
  });

  it('forced IEC units imply 1024, other units follow the standard', () => {
    expect(format(1536, { unit: 'KiB' })).toBe('1.5 KiB');
    expect(format(1536, { unit: 'KiB', standard: 'si' })).toBe('1.5 KiB');
    expect(format(1500, { unit: 'kB', standard: 'iec' })).toBe('1.5 kB');
    expect(format(1536, { unit: 'kib' as 'KiB' })).toBe('1.5 KiB');
    expect(() => format(1, { unit: 'XB' as 'KB' })).toThrow(/Unknown unit/);
  });

  it('formats bits', () => {
    expect(format(1, { bits: true })).toBe('8 bit');
    expect(format(128, { bits: true })).toBe('1 Kbit');
    expect(format(1000, { bits: true })).toBe('7.81 Kbit');
    expect(format(125, { bits: true, standard: 'si' })).toBe('1 kbit');
    expect(format(125_000, { bits: true, standard: 'si' })).toBe('1 Mbit');
    expect(format(128 * KB, { bits: true, standard: 'iec' })).toBe('1 Mibit');
    expect(format(125_000, { unit: 'kbit', standard: 'si' })).toBe('1000 kbit');
    expect(format(125_000, { unit: 'Mbit', standard: 'si' })).toBe('1 Mbit');
    expect(format(1, { bits: true, long: true })).toBe('8 bits');
    expect(format(0.125, { bits: true, long: true })).toBe('1 bit');
    expect(format(125_000, { bits: true, long: true, standard: 'si' })).toBe('1 megabit');
    expect(format(128 * KB, { bits: true, long: true, standard: 'iec' })).toBe('1 mebibit');
    expect(format(2n ** 30n, { bits: true })).toBe('8 Gbit');
  });

  it('formats long unit names', () => {
    expect(format(0, { long: true })).toBe('0 bytes');
    expect(format(1, { long: true })).toBe('1 byte');
    expect(format(2, { long: true })).toBe('2 bytes');
    expect(format(1024, { long: true })).toBe('1 kilobyte');
    expect(format(1536, { long: true })).toBe('1.5 kilobytes');
    expect(format(1500, { long: true, standard: 'si' })).toBe('1.5 kilobytes');
    expect(format(1536, { long: true, standard: 'iec' })).toBe('1.5 kibibytes');
    expect(format(GB, { long: true, standard: 'iec' })).toBe('1 gibibyte');
    expect(format(-1024, { long: true })).toBe('-1 kilobyte');
    expect(format(1024, { long: true, fixedDecimals: true })).toBe('1.00 kilobytes');
    expect(format(1024 ** 8 * 2, { long: true })).toBe('2 yottabytes');
  });

  it('shows signs', () => {
    expect(format(-1536)).toBe('-1.5 KB');
    expect(format(1536, { signed: true })).toBe('+1.5 KB');
    expect(format(-1536, { signed: true })).toBe('-1.5 KB');
    expect(format(0, { signed: true })).toBe('0 B');
    expect(format(0.001, { signed: true })).toBe('0 B');
    expect(format(-0.001)).toBe('0 B');
    expect(format(-0)).toBe('0 B');
    expect(format(-5n)).toBe('-5 B');
  });

  it('formats fractional bytes', () => {
    expect(format(0.5)).toBe('0.5 B');
    expect(format(1023.5)).toBe('1023.5 B');
    expect(format(0.004)).toBe('0 B');
    expect(format(0.005)).toBe('0.01 B');
  });

  it('formats numbers with Intl.NumberFormat when locale is set', () => {
    expect(format(1536, { locale: 'de' })).toBe('1,5 KB');
    expect(format(1536, { locale: 'en' })).toBe('1.5 KB');
    expect(format(1536, { locale: ['fr', 'en'] })).toBe('1,5 KB');
    expect(format(1024, { locale: 'de', fixedDecimals: true })).toBe('1,00 KB');
    expect(format(-1536, { locale: 'de' })).toBe('-1,5 KB');
    expect(format(1536, { locale: 'de', long: true })).toBe('1,5 kilobytes');
    expect(format(1536, { locale: false })).toBe('1.5 KB');
    expect(format(1536, { locale: true })).toBe(new Intl.NumberFormat().format(1.5) + ' KB');
  });

  it('formats bigints, including beyond Number.MAX_SAFE_INTEGER and YB', () => {
    expect(format(0n)).toBe('0 B');
    expect(format(1536n)).toBe('1.5 KB');
    expect(format(2n ** 64n)).toBe('16 EB');
    expect(format(2n ** 64n, { standard: 'iec' })).toBe('16 EiB');
    expect(format(2n ** 64n, { standard: 'si' })).toBe('18.45 EB');
    expect(format(2n ** 70n)).toBe('1 ZB');
    expect(format(2n ** 80n)).toBe('1 YB');
    expect(format(2n ** 100n)).toBe('1048576 YB');
    expect(format(10n ** 30n, { standard: 'si' })).toBe('1000000 YB');
    expect(format(2n ** 64n - 1n, { unit: 'B' })).toBe('18446744073709551615 B');
    expect(format(2n ** 64n - 1n, { unit: 'B', locale: 'en' })).toBe('18,446,744,073,709,551,615 B');
    expect(format(2n ** 64n - 1n, { unit: 'B', fixedDecimals: true })).toBe('18446744073709551615.00 B');
    expect(format(2n ** 100n, { unit: 'KB' })).toBe(`${2n ** 90n} KB`);
    expect(format(9007199254740993n, { standard: 'iec' })).toBe('8 PiB');
    expect(format(-(2n ** 70n))).toBe('-1 ZB');
    expect(format(1536n, { long: true })).toBe('1.5 kilobytes');
  });

  it('keeps huge numbers in the largest unit', () => {
    expect(format(1e30)).toBe('827180.61 YB');
    expect(format(1e30, { standard: 'si' })).toBe('1000000 YB');
    expect(format(Number.MAX_VALUE, { standard: 'si' })).toMatch(/^1\.79\d*e\+284 YB$/);
  });

  it('normalizes byte-size strings', () => {
    expect(format('1536')).toBe('1.5 KB');
    expect(format('1.5 GiB')).toBe('1.5 GB');
    expect(format('1.5 GiB', { standard: 'iec' })).toBe('1.5 GiB');
    expect(format('1500 kB', { standard: 'si' })).toBe('1.5 MB');
    expect(() => format('nope')).toThrow(BytesError);
  });

  it('throws on invalid input', () => {
    expect(() => format(NaN)).toThrow(/finite.*NaN/);
    expect(() => format(Infinity)).toThrow(/finite/);
    expect(() => format(-Infinity)).toThrow(/finite/);
    expect(() => format(null as unknown as number)).toThrow(/got null/);
    expect(() => format({} as unknown as number)).toThrow(BytesError);
    expect(() => format(1, { standard: 'decimal' as Standard })).toThrow(/Unknown standard/);
    expect(() => format(Number.MAX_VALUE, { bits: true })).toThrow(/finite|too large/);
  });
});

describe('round trip', () => {
  // Deterministic PRNG so failures are reproducible.
  let seed = 12345;
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const randomSize = () => {
    const n = random() * 2 ** Math.floor(random() * 90); // 0 .. ~1e27 (past YB)
    return random() < 0.1 ? -n : n;
  };

  const variants: Array<FormatOptions & { caseSensitive?: boolean }> = [
    {},
    { standard: 'si' },
    { standard: 'iec' },
    { decimals: 0 },
    { decimals: 5 },
    { fixedDecimals: true },
    { long: true },
    { long: true, standard: 'iec' },
    { bits: true },
    { bits: true, standard: 'si' },
    { bits: true, long: true, standard: 'iec' },
    { signed: true },
    { unitSeparator: '' },
    { locale: 'en' },
    { unit: 'MB' },
    { unit: 'KiB', locale: 'en' },
  ];

  for (const options of variants) {
    it(`parse(format(n)) ≈ n with ${JSON.stringify(options)}`, () => {
      const decimals = options.decimals ?? 2;
      const standard = options.unit === 'KiB' ? undefined : options.standard;
      for (let i = 0; i < 2000; i++) {
        const n = randomSize();
        const text = format(n, options);
        const back = parse(text as string, { standard });
        // The error is at most half of the last shown digit, in the unit that was shown.
        const half = 0.5 * 10 ** -decimals;
        const unitBytes = options.unit === 'MB' ? MB : options.unit === 'KiB' ? KB : undefined;
        const tolerance = (unitBytes
          ? half * unitBytes
          : half * Math.max(Math.abs(n), Math.abs(back), options.bits ? 1 / 8 : 1)) + 1e-12 * Math.abs(n);
        expect(Math.abs(back - n), `${n} -> '${text}' -> ${back}`).toBeLessThanOrEqual(tolerance);
        // Formatting again gives the same text.
        expect(format(back, options)).toBe(text);
      }
    });
  }

  it('is exact for whole units', () => {
    for (let e = 0; e <= 8; e++) {
      for (const m of [1, 2, 5, 10, 100, 512, 1000, 1023]) {
        const n = m * 1024 ** e;
        expect(parse(format(n) as string)).toBe(n);
        expect(parse(format(n, { standard: 'iec' }) as string)).toBe(n);
        const s = m * 1000 ** e;
        const back = parse(format(s, { standard: 'si', decimals: 3 }) as string, { standard: 'si' });
        expect(Math.abs(back - s)).toBeLessThanOrEqual(s * 1e-15);
      }
    }
  });

  it('round-trips bigints through parseBigInt', () => {
    for (let i = 0; i < 2000; i++) {
      const n = BigInt(Math.floor(random() * 2 ** 50)) * 2n ** BigInt(Math.floor(random() * 60));
      const text = format(n, { decimals: 6 });
      const back = parseBigInt(text as string);
      const diff = Number(back > n ? back - n : n - back);
      expect(diff, `${n} -> '${text}' -> ${back}`).toBeLessThanOrEqual(Number(n) * 0.5e-6 + 0.5);
    }
  });

  it('parse(format(parse(s))) normalizes many spellings', () => {
    const same = ['1536', '1.5 KB', '1.5kb', '1,536 B', '1.5 kilobytes', '1.5 KiB', '12 Kbit', '12288 bits', '1.5k', '1.5Ki'];
    for (const s of same) expect(format(parse(s as string))).toBe('1.5 KB');
  });
});

describe('types', () => {
  it('returns number for strings and string for numbers', () => {
    expectTypeOf(humanbytes('1 KB')).toEqualTypeOf<number>();
    expectTypeOf(humanbytes(1024)).toEqualTypeOf<string>();
    expectTypeOf(humanbytes(1024n)).toEqualTypeOf<string>();
    expectTypeOf(parseBigInt('1 KB')).toEqualTypeOf<bigint>();
  });

  it('accepts valid literals and catches typos at compile time', () => {
    humanbytes('1.5 KB');
    humanbytes('10mb');
    humanbytes('2 GiB');
    humanbytes('512 bytes');
    humanbytes('1.5 kilobytes');
    humanbytes('1,024 B');
    humanbytes('  -1 kb ');
    humanbytes('100 Mbit');
    humanbytes('512Mi');
    humanbytes('1024');
    humanbytes('.5 KB');
    humanbytes('+1 KB');
    humanbytes('1e3 KB');
    humanbytes('1 YiB');
    humanbytes('8 kibibits');
    parse('1.5 KB');
    // @ts-expect-error - unknown unit
    expect(() => humanbytes('10 MBs')).toThrow();
    // @ts-expect-error - misspelled unit
    expect(() => parse('5 kilobites')).toThrow();
    // @ts-expect-error - no number
    expect(() => humanbytes('KB')).toThrow();
    // @ts-expect-error - unit option is checked
    expect(() => format(1, { unit: 'XB' })).toThrow();
    // plain strings (env vars, config) are checked at runtime
    const fromEnv: string = '64 MB';
    expect(humanbytes(fromEnv)).toBe(64 * MB);
  });

  it('ByteSize types config objects', () => {
    const config: { limit: ByteSize } = { limit: '10 MB' };
    const other: { limit: ByteSize } = { limit: 1024 };
    expect(parse(config.limit as string)).toBe(10 * MB);
    expect(parse(other.limit as number)).toBe(1024);
  });
});
