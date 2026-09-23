/**
 * @jest-environment node
 */
import { ANNOTATION_COLUMNS, CARD_COLUMNS, QUIZ_METADATA_COLUMNS } from '../../scripts/content-pipeline/constants';
import { convertWorkbooksToPackage } from '../../scripts/content-pipeline/convert';
import { fingerprintContent } from '../../scripts/content-pipeline/fingerprint';
import { buildSyntheticWorkbook } from '../../scripts/content-pipeline/syntheticData';
import { cadetSource } from '../../scripts/content-pipeline/testSupport';
import { validateSourceWorkbook } from '../../scripts/content-pipeline/validateSource';
import {
  createAuthoringWorkbook,
  parseWorkbookBuffer,
  workbookToBuffer,
} from '../../scripts/content-pipeline/workbookIo';

describe('Excel source row numbers', () => {
  it('keeps the real annotation row when blank rows sit between data rows', async () => {
    const source = cadetSource();
    const workbook = createAuthoringWorkbook(source, { synthetic: true });
    const sheet = workbook.getWorksheet('Annotations');
    if (!sheet) {
      throw new Error('missing Annotations sheet');
    }
    sheet.insertRow(3, []);

    const intact = await parseWorkbookBuffer(await workbookToBuffer(workbook), source.workbookName);
    expect(intact.errors).toEqual([]);
    expect(intact.data?.annotations.map((annotation) => annotation.sourceRow)).toEqual([2, 4]);
    if (!intact.data) {
      throw new Error('expected parsed workbook');
    }

    const fromSheet = convertWorkbooksToPackage([intact.data]);
    const fromMemory = convertWorkbooksToPackage([source]);
    expect(fromSheet.errors).toEqual([]);
    expect(fromMemory.errors).toEqual([]);
    expect(fingerprintContent(fromSheet.content!)).toBe(fingerprintContent(fromMemory.content!));
    expect(JSON.stringify(fromSheet.content)).not.toContain('sourceRow');

    const phraseColumn = ANNOTATION_COLUMNS.indexOf('phrase') + 1;
    const shifted = sheet.getRow(4);
    shifted.getCell(phraseColumn).value = 'missing from verse';
    shifted.commit();

    const broken = await parseWorkbookBuffer(await workbookToBuffer(workbook), source.workbookName);
    if (!broken.data) {
      throw new Error('expected parsed workbook');
    }
    const sourceError = validateSourceWorkbook(broken.data).find(
      (item) => item.code === 'unresolved_phrase_target',
    );
    const conversionError = convertWorkbooksToPackage([broken.data]).errors.find(
      (item) => item.code === 'unresolved_phrase_target',
    );
    expect(sourceError?.row).toBe(4);
    expect(sourceError?.sheet).toBe('Annotations');
    expect(conversionError?.row).toBe(4);
  });

  it('reports the real card and quiz rows after blank rows', async () => {
    const source = buildSyntheticWorkbook('beginner');
    const workbook = createAuthoringWorkbook(source, { synthetic: true });
    const cards = workbook.getWorksheet('Cards');
    const quiz = workbook.getWorksheet('QuizMetadata');
    if (!cards || !quiz) {
      throw new Error('missing sheets');
    }

    cards.insertRow(3, []);
    const referenceColumn = CARD_COLUMNS.indexOf('reference') + 1;
    const cardRow = cards.getRow(5);
    cardRow.getCell(referenceColumn).value = '';
    cardRow.commit();

    quiz.insertRow(2, []);
    const cardIdColumn = QUIZ_METADATA_COLUMNS.indexOf('cardId') + 1;
    const quizRow = quiz.getRow(3);
    quizRow.getCell(cardIdColumn).value = 'missing-card';
    quizRow.commit();

    const parsed = await parseWorkbookBuffer(await workbookToBuffer(workbook), source.workbookName);
    if (!parsed.data) {
      throw new Error(parsed.errors.map((item) => item.reason).join('\n'));
    }

    const errors = validateSourceWorkbook(parsed.data);
    expect(errors.find((item) => item.field === 'reference')?.row).toBe(5);
    expect(errors.find((item) => item.code === 'unknown_card_locator' && item.sheet === 'QuizMetadata')?.row).toBe(
      3,
    );
  });
});