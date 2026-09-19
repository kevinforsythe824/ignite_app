import type { CellValue } from 'exceljs';

export function cellToRaw(value: CellValue | undefined): unknown {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === 'object' && value !== null && 'richText' in value) {
    const rich = value as { richText: { text: string }[] };
    return rich.richText.map((part) => part.text).join('');
  }
  if (typeof value === 'object' && value !== null && 'text' in value) {
    return (value as { text: string }).text;
  }
  if (typeof value === 'object' && value !== null && 'result' in value) {
    return (value as { result: unknown }).result;
  }
  return value;
}

export function cellToTrimmedString(value: CellValue | undefined): string | undefined {
  const raw = cellToRaw(value);
  if (raw === undefined || raw === null) {
    return undefined;
  }
  const text = String(raw).trim();
  return text.length > 0 ? text : undefined;
}

export function cellToInteger(value: CellValue | undefined): number | undefined {
  const raw = cellToRaw(value);
  if (raw === undefined || raw === null || raw === '') {
    return undefined;
  }
  if (typeof raw === 'number') {
    return Number.isInteger(raw) ? raw : undefined;
  }
  const text = String(raw).trim();
  if (text.length === 0) {
    return undefined;
  }
  if (!/^-?\d+$/.test(text)) {
    return Number.NaN;
  }
  return Number.parseInt(text, 10);
}

export function isBlankRow(values: unknown[]): boolean {
  return values.every((value) => {
    if (value === undefined || value === null) {
      return true;
    }
    if (typeof value === 'string') {
      return value.trim().length === 0;
    }
    return false;
  });
}
