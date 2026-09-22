import ExcelJS from 'exceljs';
import {
  ANNOTATION_COLUMNS,
  CARD_COLUMNS,
  CROSS_REFERENCE_COLUMNS,
  MATERIAL_SET_COLUMNS,
  PACKAGE_COLUMNS,
  QUIZ_METADATA_COLUMNS,
  REQUIRED_WORKBOOK_SHEETS,
  SECTION_COLUMNS,
  SYNTHETIC_DATASET_LABEL,
  WORKBOOK_SCHEMA_VERSION,
} from './constants';
import { cellToInteger, cellToRaw, cellToTrimmedString, isBlankRow } from './cells';
import { issue } from './errors';
import type {
  AnnotationRow,
  AuthoringWorkbookData,
  CardRow,
  CrossReferenceRow,
  MaterialSetRow,
  PackageRow,
  QuizMetadataRow,
  SectionRow,
  ValidationIssue,
} from './types';

export interface ParseWorkbookResult {
  data?: AuthoringWorkbookData;
  errors: ValidationIssue[];
}

function headerMap(
  row: ExcelJS.Row,
): { byName: Map<string, number>; names: string[] } {
  const byName = new Map<string, number>();
  const names: string[] = [];
  row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const name = cellToTrimmedString(cell.value);
    if (name) {
      byName.set(name, colNumber);
      names.push(name);
    }
  });
  return { byName, names };
}

function missingColumns(
  present: Map<string, number>,
  required: readonly string[],
): string[] {
  return required.filter((name) => !present.has(name));
}

function readString(
  row: ExcelJS.Row,
  columns: Map<string, number>,
  field: string,
): string | undefined {
  const col = columns.get(field);
  if (col === undefined) {
    return undefined;
  }
  return cellToTrimmedString(row.getCell(col).value);
}

function readInteger(
  row: ExcelJS.Row,
  columns: Map<string, number>,
  field: string,
): number | undefined {
  const col = columns.get(field);
  if (col === undefined) {
    return undefined;
  }
  return cellToInteger(row.getCell(col).value);
}

/**
 * Blank occurrenceIndex is omitted (undefined).
 * A provided non-whole-number cell is NaN so it is not treated as blank.
 * 0 and negative whole numbers are preserved for later range checks.
 */
function readOccurrenceIndex(
  row: ExcelJS.Row,
  columns: Map<string, number>,
): number | undefined {
  const col = columns.get('occurrenceIndex');
  if (col === undefined) {
    return undefined;
  }
  const raw = cellToRaw(row.getCell(col).value);
  if (raw === undefined || raw === null || raw === '') {
    return undefined;
  }
  if (typeof raw === 'number') {
    return Number.isInteger(raw) ? raw : Number.NaN;
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

function rowValues(row: ExcelJS.Row, columns: Map<string, number>): unknown[] {
  return [...columns.values()].map((col) => cellToRaw(row.getCell(col).value));
}

function applyColumns(
  sheet: ExcelJS.Worksheet,
  columns: readonly string[],
): void {
  sheet.columns = columns.map((header) => ({
    header,
    key: header,
    width: Math.max(16, header.length + 4),
  }));
  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.commit();
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

function addReadmeSheet(workbook: ExcelJS.Workbook, options: { synthetic: boolean }): void {
  const sheet = workbook.addWorksheet('README');
  sheet.getColumn(1).width = 28;
  sheet.getColumn(2).width = 96;
  const lines: [string, string][] = [
    ['IGNITE WORKBOOK', 'MaterialSet authoring template'],
    [
      'Status',
      options.synthetic
        ? SYNTHETIC_DATASET_LABEL
        : 'TEMPLATE — copy per MaterialSet; not official WPF material',
    ],
    ['Workbook schema', WORKBOOK_SCHEMA_VERSION],
    [
      'Workflow',
      'Maintain in Google Sheets or a compatible spreadsheet editor. File → Download → Microsoft Excel (.xlsx). Run local Ignite content tooling. No Google API or credentials required.',
    ],
    [
      'Corrections',
      'Edit this workbook, then validate and regenerate the package. Do not patch generated JSON by hand.',
    ],
    [
      'Identifiers',
      'Humans enter seasonId, materialSetId, divisionId, displayName, cardNumber, reference, verseText, sectionId/title/order, and annotation targeting. cardId is optional; if blank, tooling derives c{cardNumber}. annotationId is always derived.',
    ],
    [
      'Required sheets',
      REQUIRED_WORKBOOK_SHEETS.join(', '),
    ],
    ['Package columns (required)', 'seasonId, name, startDate, endDate, status, sourceVersion, schemaVersion'],
    ['Package columns (optional)', 'sourceMaterialReleaseDate, igniteAvailabilityDate'],
    ['MaterialSet columns (required)', 'seasonId, materialSetId, divisionId, displayName'],
    ['Sections columns (required)', 'sectionId, title, displayOrder'],
    ['Sections columns (optional)', 'description'],
    ['Cards columns (required)', 'cardNumber, reference, verseText, sectionId'],
    ['Cards columns (optional / technical)', 'cardId (optional explicit ID), indexCode, tags'],
    [
      'Annotations',
      'Required: type, strategy, and a card locator (cardNumber or cardId). For phraseOccurrence, type the exact phrase from the verse. occurrenceIndex is optional when that exact phrase occurs once — leave it blank. If the phrase occurs more than once, enter the 1-based occurrence number (1, 2, 3, …) for the match you mean. The tool will not guess. Types listed below are SYNTHETIC/DEV vocabulary, not official committee notation. Official mapping is Phase 2B.',
    ],
    [
      'Synthetic annotation types',
      'highlight, underline, keyword, uniqueBeginning, uniqueEnding, frequency, crossReference',
    ],
    ['QuizMetadata (optional rows)', 'cardNumber or cardId; optional pointValue, questionHint'],
    ['CrossReferences (optional rows)', 'fromCardNumber or fromCardId; optional toReference, toCardNumber, toCardId, notes'],
    [
      'Fail-closed',
      'Missing required fields, duplicate IDs/card numbers, invalid sections, and unresolved or ambiguous annotation targets fail validation. The pipeline does not silently repair authoritative source.',
    ],
  ];
  lines.forEach(([title, body], index) => {
    const row = sheet.getRow(index + 1);
    row.getCell(1).value = title;
    row.getCell(1).font = { bold: true };
    row.getCell(2).value = body;
    row.getCell(2).alignment = { wrapText: true, vertical: 'top' };
    row.height = title === 'Annotations' ? 72 : 36;
    row.commit();
  });
}

export function createAuthoringWorkbook(
  data: Omit<AuthoringWorkbookData, 'workbookName'>,
  options: { synthetic?: boolean } = {},
): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Ignite content pipeline';
  addReadmeSheet(workbook, { synthetic: options.synthetic === true });

  const packageSheet = workbook.addWorksheet('Package');
  applyColumns(packageSheet, PACKAGE_COLUMNS);
  packageSheet.addRow(data.package);

  const materialSetSheet = workbook.addWorksheet('MaterialSet');
  applyColumns(materialSetSheet, MATERIAL_SET_COLUMNS);
  materialSetSheet.addRow(data.materialSet);

  const sectionsSheet = workbook.addWorksheet('Sections');
  applyColumns(sectionsSheet, SECTION_COLUMNS);
  for (const section of data.sections) {
    sectionsSheet.addRow(section);
  }

  const cardsSheet = workbook.addWorksheet('Cards');
  applyColumns(cardsSheet, CARD_COLUMNS);
  for (const card of data.cards) {
    cardsSheet.addRow(card);
  }

  const annotationsSheet = workbook.addWorksheet('Annotations');
  applyColumns(annotationsSheet, ANNOTATION_COLUMNS);
  for (const annotation of data.annotations) {
    annotationsSheet.addRow(annotation);
  }

  const quizSheet = workbook.addWorksheet('QuizMetadata');
  applyColumns(quizSheet, QUIZ_METADATA_COLUMNS);
  for (const row of data.quizMetadata) {
    quizSheet.addRow(row);
  }

  const xrefSheet = workbook.addWorksheet('CrossReferences');
  applyColumns(xrefSheet, CROSS_REFERENCE_COLUMNS);
  for (const row of data.crossReferences) {
    xrefSheet.addRow(row);
  }

  return workbook;
}

export async function workbookToBuffer(workbook: ExcelJS.Workbook): Promise<Buffer> {
  const raw = await workbook.xlsx.writeBuffer();
  return Buffer.from(raw);
}

export async function parseWorkbookBuffer(
  buffer: Buffer,
  workbookName: string,
): Promise<ParseWorkbookResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  return parseLoadedWorkbook(workbook, workbookName);
}

export async function parseWorkbookFile(filePath: string, workbookName: string): Promise<ParseWorkbookResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  return parseLoadedWorkbook(workbook, workbookName);
}

function parseLoadedWorkbook(
  workbook: ExcelJS.Workbook,
  workbookName: string,
): ParseWorkbookResult {
  const errors: ValidationIssue[] = [];
  const presentSheets = new Set(workbook.worksheets.map((sheet) => sheet.name));

  for (const name of REQUIRED_WORKBOOK_SHEETS) {
    if (!presentSheets.has(name)) {
      errors.push(
        issue({
          code: 'missing_sheet',
          workbook: workbookName,
          sheet: name,
          reason: `Required sheet "${name}" is missing.`,
        }),
      );
    }
  }

  if (errors.length > 0) {
    return { errors };
  }

  const packageResult = readSingleObjectSheet<PackageRow>({
    workbook,
    workbookName,
    sheetName: 'Package',
    columns: PACKAGE_COLUMNS,
    readRow: (row, columns) => ({
      seasonId: readString(row, columns, 'seasonId') ?? '',
      name: readString(row, columns, 'name') ?? '',
      startDate: readString(row, columns, 'startDate') ?? '',
      endDate: readString(row, columns, 'endDate') ?? '',
      status: readString(row, columns, 'status') ?? '',
      sourceVersion: readString(row, columns, 'sourceVersion') ?? '',
      schemaVersion: readString(row, columns, 'schemaVersion') ?? '',
      sourceMaterialReleaseDate: readString(row, columns, 'sourceMaterialReleaseDate'),
      igniteAvailabilityDate: readString(row, columns, 'igniteAvailabilityDate'),
    }),
  });
  errors.push(...packageResult.errors);

  const materialSetResult = readSingleObjectSheet<MaterialSetRow>({
    workbook,
    workbookName,
    sheetName: 'MaterialSet',
    columns: MATERIAL_SET_COLUMNS,
    readRow: (row, columns) => ({
      seasonId: readString(row, columns, 'seasonId') ?? '',
      materialSetId: readString(row, columns, 'materialSetId') ?? '',
      divisionId: readString(row, columns, 'divisionId') ?? '',
      displayName: readString(row, columns, 'displayName') ?? '',
    }),
  });
  errors.push(...materialSetResult.errors);

  const sections = readListSheet<SectionRow>({
    workbook,
    workbookName,
    sheetName: 'Sections',
    columns: SECTION_COLUMNS,
    readRow: (row, columns, rowNumber) => {
      const displayOrder = readInteger(row, columns, 'displayOrder');
      if (displayOrder !== undefined && Number.isNaN(displayOrder)) {
        errors.push(
          issue({
            code: 'invalid_display_order',
            workbook: workbookName,
            sheet: 'Sections',
            row: rowNumber,
            field: 'displayOrder',
            reason: 'displayOrder must be an integer.',
          }),
        );
      }
      return {
        sectionId: readString(row, columns, 'sectionId') ?? '',
        title: readString(row, columns, 'title') ?? '',
        displayOrder: displayOrder !== undefined && !Number.isNaN(displayOrder) ? displayOrder : Number.NaN,
        description: readString(row, columns, 'description'),
      };
    },
  });
  errors.push(...sections.errors);

  const cards = readListSheet<CardRow>({
    workbook,
    workbookName,
    sheetName: 'Cards',
    columns: CARD_COLUMNS,
    readRow: (row, columns, rowNumber) => {
      const cardNumber = readInteger(row, columns, 'cardNumber');
      if (cardNumber !== undefined && Number.isNaN(cardNumber)) {
        errors.push(
          issue({
            code: 'invalid_card_number',
            workbook: workbookName,
            sheet: 'Cards',
            row: rowNumber,
            field: 'cardNumber',
            reason: 'cardNumber must be an integer.',
          }),
        );
      }
      return {
        cardNumber: cardNumber !== undefined && !Number.isNaN(cardNumber) ? cardNumber : Number.NaN,
        reference: readString(row, columns, 'reference') ?? '',
        verseText: readString(row, columns, 'verseText') ?? '',
        sectionId: readString(row, columns, 'sectionId') ?? '',
        cardId: readString(row, columns, 'cardId'),
        indexCode: readString(row, columns, 'indexCode'),
        tags: readString(row, columns, 'tags'),
      };
    },
  });
  errors.push(...cards.errors);

  const annotations = readListSheet<AnnotationRow>({
    workbook,
    workbookName,
    sheetName: 'Annotations',
    columns: ANNOTATION_COLUMNS,
    readRow: (row, columns, rowNumber) => {
      const cardNumber = readInteger(row, columns, 'cardNumber');
      const occurrenceIndex = readOccurrenceIndex(row, columns);
      if (cardNumber !== undefined && Number.isNaN(cardNumber)) {
        errors.push(
          issue({
            code: 'invalid_card_number',
            workbook: workbookName,
            sheet: 'Annotations',
            row: rowNumber,
            field: 'cardNumber',
            reason: 'cardNumber must be an integer when provided.',
          }),
        );
      }
      if (occurrenceIndex !== undefined && Number.isNaN(occurrenceIndex)) {
        errors.push(
          issue({
            code: 'invalid_occurrence_index',
            workbook: workbookName,
            sheet: 'Annotations',
            row: rowNumber,
            field: 'occurrenceIndex',
            reason:
              'occurrenceIndex must be a whole number when provided. Leave it blank only when the phrase occurs once.',
          }),
        );
      }
      return {
        cardNumber: cardNumber !== undefined && !Number.isNaN(cardNumber) ? cardNumber : undefined,
        cardId: readString(row, columns, 'cardId'),
        type: readString(row, columns, 'type') ?? '',
        strategy: readString(row, columns, 'strategy') ?? '',
        phrase: readString(row, columns, 'phrase'),
        occurrenceIndex,
        notes: readString(row, columns, 'notes'),
      };
    },
  });
  errors.push(...annotations.errors);

  const quizMetadata = readListSheet<QuizMetadataRow>({
    workbook,
    workbookName,
    sheetName: 'QuizMetadata',
    columns: QUIZ_METADATA_COLUMNS,
    readRow: (row, columns, rowNumber) => {
      const cardNumber = readInteger(row, columns, 'cardNumber');
      const pointValue = readInteger(row, columns, 'pointValue');
      if (cardNumber !== undefined && Number.isNaN(cardNumber)) {
        errors.push(
          issue({
            code: 'invalid_card_number',
            workbook: workbookName,
            sheet: 'QuizMetadata',
            row: rowNumber,
            field: 'cardNumber',
            reason: 'cardNumber must be an integer when provided.',
          }),
        );
      }
      if (pointValue !== undefined && Number.isNaN(pointValue)) {
        errors.push(
          issue({
            code: 'invalid_quiz_metadata',
            workbook: workbookName,
            sheet: 'QuizMetadata',
            row: rowNumber,
            field: 'pointValue',
            reason: 'pointValue must be an integer when provided.',
          }),
        );
      }
      return {
        cardNumber: cardNumber !== undefined && !Number.isNaN(cardNumber) ? cardNumber : undefined,
        cardId: readString(row, columns, 'cardId'),
        pointValue: pointValue !== undefined && !Number.isNaN(pointValue) ? pointValue : undefined,
        questionHint: readString(row, columns, 'questionHint'),
      };
    },
  });
  errors.push(...quizMetadata.errors);

  const crossReferences = readListSheet<CrossReferenceRow>({
    workbook,
    workbookName,
    sheetName: 'CrossReferences',
    columns: CROSS_REFERENCE_COLUMNS,
    readRow: (row, columns, rowNumber) => {
      const fromCardNumber = readInteger(row, columns, 'fromCardNumber');
      const toCardNumber = readInteger(row, columns, 'toCardNumber');
      if (fromCardNumber !== undefined && Number.isNaN(fromCardNumber)) {
        errors.push(
          issue({
            code: 'invalid_card_number',
            workbook: workbookName,
            sheet: 'CrossReferences',
            row: rowNumber,
            field: 'fromCardNumber',
            reason: 'fromCardNumber must be an integer when provided.',
          }),
        );
      }
      if (toCardNumber !== undefined && Number.isNaN(toCardNumber)) {
        errors.push(
          issue({
            code: 'invalid_card_number',
            workbook: workbookName,
            sheet: 'CrossReferences',
            row: rowNumber,
            field: 'toCardNumber',
            reason: 'toCardNumber must be an integer when provided.',
          }),
        );
      }
      return {
        fromCardNumber:
          fromCardNumber !== undefined && !Number.isNaN(fromCardNumber)
            ? fromCardNumber
            : undefined,
        fromCardId: readString(row, columns, 'fromCardId'),
        toReference: readString(row, columns, 'toReference'),
        toCardNumber:
          toCardNumber !== undefined && !Number.isNaN(toCardNumber) ? toCardNumber : undefined,
        toCardId: readString(row, columns, 'toCardId'),
        notes: readString(row, columns, 'notes'),
      };
    },
  });
  errors.push(...crossReferences.errors);

  if (!packageResult.value || !materialSetResult.value) {
    return { errors };
  }

  return {
    data: {
      workbookName,
      package: packageResult.value,
      materialSet: materialSetResult.value,
      sections: sections.values,
      cards: cards.values,
      annotations: annotations.values,
      quizMetadata: quizMetadata.values,
      crossReferences: crossReferences.values,
    },
    errors,
  };
}

function readSingleObjectSheet<T>(input: {
  workbook: ExcelJS.Workbook;
  workbookName: string;
  sheetName: string;
  columns: readonly string[];
  readRow: (row: ExcelJS.Row, columns: Map<string, number>) => T;
}): { value?: T; errors: ValidationIssue[] } {
  const list = readListSheet<T>({
    ...input,
    readRow: (row, columns) => input.readRow(row, columns),
  });
  if (list.values.length === 0) {
    return {
      errors: [
        ...list.errors,
        issue({
          code: 'missing_required_row',
          workbook: input.workbookName,
          sheet: input.sheetName,
          row: 2,
          reason: `Sheet "${input.sheetName}" must contain exactly one data row.`,
        }),
      ],
    };
  }
  if (list.values.length > 1) {
    return {
      errors: [
        ...list.errors,
        issue({
          code: 'unexpected_extra_row',
          workbook: input.workbookName,
          sheet: input.sheetName,
          row: 3,
          reason: `Sheet "${input.sheetName}" must contain exactly one data row.`,
        }),
      ],
    };
  }
  return { value: list.values[0], errors: list.errors };
}

function readListSheet<T>(input: {
  workbook: ExcelJS.Workbook;
  workbookName: string;
  sheetName: string;
  columns: readonly string[];
  readRow: (row: ExcelJS.Row, columns: Map<string, number>, rowNumber: number) => T;
}): { values: T[]; errors: ValidationIssue[] } {
  const errors: ValidationIssue[] = [];
  const sheet = input.workbook.getWorksheet(input.sheetName);
  if (!sheet) {
    return { values: [], errors };
  }

  const header = sheet.getRow(1);
  const { byName } = headerMap(header);
  const missing = missingColumns(byName, input.columns);
  if (missing.length > 0) {
    errors.push(
      issue({
        code: 'missing_columns',
        workbook: input.workbookName,
        sheet: input.sheetName,
        row: 1,
        reason: `Missing required column(s): ${missing.join(', ')}.`,
      }),
    );
    return { values: [], errors };
  }

  const values: T[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }
    if (isBlankRow(rowValues(row, byName))) {
      return;
    }
    values.push(input.readRow(row, byName, rowNumber));
  });

  return { values, errors };
}
