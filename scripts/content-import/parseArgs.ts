export type ParsedContentImportArgs =
  | { ok: true; packageDir: string; mode: 'offline-plan' | 'dev-diff' }
  | { ok: false; message: string };

const USAGE =
  'Usage: npm run content:import -- --package <package-directory> [--dev-diff]';

export function parseContentImportArgs(argv: readonly string[]): ParsedContentImportArgs {
  if (argv.includes('--apply') || argv.includes('--confirm-dev')) {
    return {
      ok: false,
      message:
        'Apply is not implemented. This command can print an offline plan or a DEV read-only diff. It does not write.',
    };
  }

  const packageFlag = argv.indexOf('--package');
  const packageDir = packageFlag === -1 ? undefined : argv[packageFlag + 1];
  if (!packageDir || packageDir.startsWith('--')) {
    return { ok: false, message: USAGE };
  }

  return {
    ok: true,
    packageDir,
    mode: argv.includes('--dev-diff') ? 'dev-diff' : 'offline-plan',
  };
}
