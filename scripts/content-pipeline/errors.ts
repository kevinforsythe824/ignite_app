import type { ValidationIssue } from './types';

export class ContentPipelineError extends Error {
  readonly issues: readonly ValidationIssue[];

  constructor(message: string, issues: readonly ValidationIssue[] = []) {
    super(message);
    this.name = 'ContentPipelineError';
    this.issues = issues;
  }
}

export function issue(
  partial: Omit<ValidationIssue, 'severity'> & { severity?: ValidationIssue['severity'] },
): ValidationIssue {
  return {
    severity: partial.severity ?? 'error',
    code: partial.code,
    reason: partial.reason,
    workbook: partial.workbook,
    sheet: partial.sheet,
    row: partial.row,
    field: partial.field,
  };
}

export function formatValidationIssue(item: ValidationIssue): string {
  const location: string[] = [];
  if (item.workbook) {
    location.push(item.workbook);
  }
  if (item.sheet) {
    location.push(item.sheet);
  }
  if (item.row !== undefined) {
    location.push(`row ${item.row}`);
  }
  if (item.field) {
    location.push(`field "${item.field}"`);
  }

  const prefix = location.length > 0 ? `[${location.join(' / ')}] ` : '';
  return `${prefix}${item.reason}`;
}

export function formatValidationIssues(issues: readonly ValidationIssue[]): string {
  if (issues.length === 0) {
    return 'No issues.';
  }
  return issues.map((item, index) => `${index + 1}. ${formatValidationIssue(item)}`).join('\n');
}
