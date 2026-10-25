import type {
  CellFormulaValue,
  CellRichTextValue,
  CellSharedFormulaValue,
  CellValue,
} from 'exceljs';

/**
 * One sponsor cell, interpreted without inventing text.
 * Blank is only null, undefined, or an empty string.
 * Rich text is the parts concatenated in order.
 * Numbers stay numbers. Other objects, including hyperlinks, are invalid.
 */
export type SponsorInterpretedCell =
  | { readonly status: 'blank' }
  | { readonly status: 'text'; readonly text: string }
  | { readonly status: 'number'; readonly value: number }
  | { readonly status: 'invalid'; readonly reason: string };

function isRichText(value: object): value is CellRichTextValue {
  return 'richText' in value && Array.isArray((value as CellRichTextValue).richText);
}

function isFormula(value: object): value is CellFormulaValue | CellSharedFormulaValue {
  return 'formula' in value || 'sharedFormula' in value;
}

function interpretRichText(parts: CellRichTextValue['richText']): SponsorInterpretedCell {
  let text = '';
  for (const part of parts) {
    if (typeof part?.text !== 'string') {
      return { status: 'invalid', reason: 'Rich text part must be text.' };
    }
    text += part.text;
  }
  return text.length === 0 ? { status: 'blank' } : { status: 'text', text };
}

export function interpretSponsorCell(value: CellValue | null | undefined): SponsorInterpretedCell {
  if (value === null || value === undefined) {
    return { status: 'blank' };
  }
  if (typeof value === 'string') {
    return value.length === 0 ? { status: 'blank' } : { status: 'text', text: value };
  }
  if (typeof value === 'number') {
    return Number.isFinite(value)
      ? { status: 'number', value }
      : { status: 'invalid', reason: 'Cell number must be finite.' };
  }
  if (typeof value === 'boolean' || value instanceof Date) {
    return { status: 'invalid', reason: 'Cell type cannot be read as text or a number.' };
  }
  if (typeof value !== 'object') {
    return { status: 'invalid', reason: 'Cell type cannot be read as text or a number.' };
  }
  if (isRichText(value)) {
    return interpretRichText(value.richText);
  }
  if (isFormula(value)) {
    if (value.result === undefined) {
      return { status: 'invalid', reason: 'Formula cell has no cached text or number result.' };
    }
    return interpretSponsorCell(value.result);
  }
  return { status: 'invalid', reason: 'Cell type cannot be read as text or a number.' };
}
