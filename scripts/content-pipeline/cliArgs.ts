export function readArg(flag: string, fallback?: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return fallback;
  }
  return process.argv[index + 1] ?? fallback;
}

export function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}
