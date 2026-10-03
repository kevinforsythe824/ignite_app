import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const PRODUCTION_ROOTS = [
  'src/features/season/components',
  'src/features/season/copy',
  'src/features/season/hooks',
  'src/features/season/navigation',
  'src/features/season/screens',
  'src/features/season/state',
  'src/features/season/utils',
];

const FORBIDDEN: readonly { label: string; pattern: RegExp }[] = [
  { label: 'dateOfBirth', pattern: /dateOfBirth/ },
  { label: 'date of birth', pattern: /date of birth/i },
  { label: 'DOB', pattern: /\bDOB\b/ },
  { label: 'AsyncStorage', pattern: /AsyncStorage/ },
  { label: 'async-storage', pattern: /async-storage/ },
  { label: '2027', pattern: /2027/ },
  { label: 'parseInt', pattern: /parseInt/ },
  { label: 'ineligibleAge', pattern: /ineligibleAge/ },
  { label: 'nonIntegerAge', pattern: /nonIntegerAge/ },
  { label: 'onboardingComplete', pattern: /onboardingComplete/ },
  { label: 'firestore', pattern: /firebase\/firestore/ },
  { label: 'functions', pattern: /firebase\/functions/ },
  { label: 'httpsCallable', pattern: /httpsCallable/ },
  { label: 'useAuth', pattern: /useAuth/ },
  { label: 'RootNavigator', pattern: /RootNavigator/ },
  { label: 'age comparison', pattern: /age\s*(>=|<=|>|<)/ },
  { label: 'age band 5-8', pattern: /\b5\s*[–-]\s*8\b/ },
  { label: 'age band 9-11', pattern: /\b9\s*[–-]\s*11\b/ },
  { label: 'age band 12-14', pattern: /\b12\s*[–-]\s*14\b/ },
  { label: 'age band 15-18', pattern: /\b15\s*[–-]\s*18\b/ },
  { label: 'age band 19+', pattern: /19\+/ },
  { label: 'route params', pattern: /route\.params/ },
  { label: 'Region screen', pattern: /name="Region"|RegionScreen/ },
  { label: 'Review screen', pattern: /name="Review"|ReviewScreen/ },
];

function productionFiles(): string[] {
  const files: string[] = [];
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory)) {
      const path = join(directory, entry);
      if (statSync(path).isDirectory()) {
        visit(path);
        continue;
      }
      if (path.endsWith('.ts') || path.endsWith('.tsx')) {
        files.push(path);
      }
    }
  };
  for (const root of PRODUCTION_ROOTS) {
    visit(join(process.cwd(), root));
  }
  return files;
}

describe('Season Setup eligibility UI source guard', () => {
  it('does not encode eligibility tables, persistence, or later-phase screens', () => {
    const files = productionFiles();
    expect(files.length).toBeGreaterThan(0);
    const hits: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      for (const rule of FORBIDDEN) {
        if (rule.pattern.test(source)) {
          hits.push(`${file} matched ${rule.label}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });
});
