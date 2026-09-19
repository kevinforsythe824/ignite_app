import type { DivisionId } from '../../src/features/season/domain/division';
import { buildSyntheticWorkbook } from './syntheticData';
import type { AuthoringWorkbookData } from './types';
import { createAuthoringWorkbook, workbookToBuffer } from './workbookIo';

export async function workbookBufferFromData(
  data: AuthoringWorkbookData,
  options: { synthetic?: boolean } = {},
): Promise<Buffer> {
  const workbook = createAuthoringWorkbook(data, options);
  return workbookToBuffer(workbook);
}

export function cloneWorkbook(data: AuthoringWorkbookData): AuthoringWorkbookData {
  return structuredClone(data);
}

export function cadetSource(): AuthoringWorkbookData {
  return buildSyntheticWorkbook('cadet' satisfies DivisionId);
}
