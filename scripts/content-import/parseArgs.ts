import { IGNITE_FIREBASE_PROJECTS } from '../../src/services/firebase/firebaseEnvironments';

export type ContentImportCliMode = 'offline-plan' | 'dev-diff' | 'dev-apply';

export type ParsedContentImportArgs =
  | {
      ok: true;
      packageDir: string;
      mode: ContentImportCliMode;
      confirmDev?: string;
    }
  | { ok: false; message: string };

const USAGE =
  'Usage: npm run content:import -- --package <package-directory> [--dev-diff | --apply --confirm-dev <dev-project-id>]';

const KNOWN_FLAGS = new Set(['--package', '--dev-diff', '--apply', '--confirm-dev']);
const VALUE_FLAGS = new Set(['--package', '--confirm-dev']);

function realArgs(argv: readonly string[]): readonly string[] {
  if (argv.length >= 2 && !argv[0].startsWith('--') && !argv[1].startsWith('--')) {
    return argv.slice(2);
  }
  return argv;
}

export function parseContentImportArgs(argv: readonly string[]): ParsedContentImportArgs {
  let packageDir: string | undefined;
  let confirmDev: string | undefined;
  let devDiff = false;
  let apply = false;
  const seen = new Set<string>();

  const args = realArgs(argv);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith('--')) {
      return { ok: false, message: `Unexpected argument: ${arg}` };
    }
    if (arg.includes('=')) {
      return {
        ok: false,
        message: `Flags must be separate from values. Unsupported: ${arg.slice(0, arg.indexOf('='))}`,
      };
    }
    if (!KNOWN_FLAGS.has(arg)) {
      return { ok: false, message: `Unknown flag: ${arg}` };
    }
    if (seen.has(arg)) {
      return { ok: false, message: `Duplicate flag: ${arg}` };
    }
    seen.add(arg);

    if (VALUE_FLAGS.has(arg)) {
      const value = args[index + 1];
      if (value === undefined || value.startsWith('--')) {
        return { ok: false, message: `Missing value for ${arg}` };
      }
      index += 1;
      if (arg === '--package') {
        packageDir = value;
      } else {
        confirmDev = value;
      }
      continue;
    }

    if (arg === '--dev-diff') {
      devDiff = true;
    } else {
      apply = true;
    }
  }

  if (!packageDir) {
    return { ok: false, message: USAGE };
  }
  if (confirmDev !== undefined && !apply) {
    return { ok: false, message: '--confirm-dev requires --apply.' };
  }
  if (apply && confirmDev === undefined) {
    return { ok: false, message: '--apply requires --confirm-dev <dev-project-id>.' };
  }
  if (apply && devDiff) {
    return { ok: false, message: '--apply cannot be combined with --dev-diff.' };
  }
  if (apply && confirmDev !== IGNITE_FIREBASE_PROJECTS.dev) {
    return {
      ok: false,
      message: `--confirm-dev must match the configured DEV project "${IGNITE_FIREBASE_PROJECTS.dev}".`,
    };
  }

  if (apply && confirmDev !== undefined) {
    return { ok: true, packageDir, mode: 'dev-apply', confirmDev };
  }

  return {
    ok: true,
    packageDir,
    mode: devDiff ? 'dev-diff' : 'offline-plan',
  };
}
