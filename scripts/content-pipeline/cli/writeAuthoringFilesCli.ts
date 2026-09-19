import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { OFFICIAL_DIVISION_IDS } from '../../../src/features/season/domain/division';
import {
  DEFAULT_SYNTHETIC_SOURCE_DIR,
  DEFAULT_TEMPLATE_PATH,
  SYNTHETIC_SEASON_ID,
  WORKBOOK_SCHEMA_VERSION,
} from '../constants';
import { buildSyntheticWorkbook } from '../syntheticData';
import { createAuthoringWorkbook } from '../workbookIo';
import type { AuthoringWorkbookData } from '../types';

function emptyTemplateData(): Omit<AuthoringWorkbookData, 'workbookName'> {
  return {
    package: {
      seasonId: '',
      name: '',
      startDate: '',
      endDate: '',
      status: '',
      sourceVersion: '',
      schemaVersion: WORKBOOK_SCHEMA_VERSION,
    },
    materialSet: {
      seasonId: '',
      materialSetId: '',
      divisionId: '',
      displayName: '',
    },
    sections: [],
    cards: [],
    annotations: [],
    quizMetadata: [],
    crossReferences: [],
  };
}

async function main(): Promise<void> {
  const templatePath = DEFAULT_TEMPLATE_PATH;
  await mkdir(path.dirname(templatePath), { recursive: true });
  const template = createAuthoringWorkbook(emptyTemplateData(), { synthetic: false });
  await template.xlsx.writeFile(templatePath);
  console.log(`Wrote workbook template to ${templatePath}`);

  await mkdir(DEFAULT_SYNTHETIC_SOURCE_DIR, { recursive: true });
  for (const divisionId of OFFICIAL_DIVISION_IDS) {
    const data = buildSyntheticWorkbook(divisionId);
    const workbook = createAuthoringWorkbook(data, { synthetic: true });
    const filePath = path.join(
      DEFAULT_SYNTHETIC_SOURCE_DIR,
      `${SYNTHETIC_SEASON_ID}-${divisionId}.xlsx`,
    );
    await workbook.xlsx.writeFile(filePath);
    console.log(`Wrote synthetic workbook ${filePath}`);
  }
}

void main();
