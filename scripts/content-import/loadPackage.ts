import { formatValidationIssues } from '../content-pipeline/errors';
import { validatePackageDirectory } from '../content-pipeline/pipeline';
import type { ContentPackage, PackageManifest } from '../content-pipeline/types';

export class ContentImportPackageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContentImportPackageError';
  }
}

export interface LoadedContentPackage {
  packageDir: string;
  content: ContentPackage;
  manifest: PackageManifest;
  fingerprint: string;
}

/**
 * Loads a generated package directory and rejects it unless structure and
 * fingerprint already validate. Does not parse workbooks.
 */
export async function loadValidatedContentPackage(
  packageDir: string,
): Promise<LoadedContentPackage> {
  let result;
  try {
    result = await validatePackageDirectory(packageDir);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Package could not be read.';
    throw new ContentImportPackageError(message);
  }

  if (result.status !== 'passed' || !result.content || !result.manifest) {
    const details = formatValidationIssues(result.report.errors);
    throw new ContentImportPackageError(
      details.length > 0 ? details : 'Package validation failed.',
    );
  }

  return {
    packageDir,
    content: result.content,
    manifest: result.manifest,
    fingerprint: result.manifest.fingerprint,
  };
}
