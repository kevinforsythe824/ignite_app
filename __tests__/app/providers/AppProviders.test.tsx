import { readFileSync } from 'fs';
import { join } from 'path';

describe('AppProviders', () => {
  it('mounts Season participation inside Auth and keeps Flashcard state off the app root', () => {
    const source = readFileSync(
      join(__dirname, '../../../src/app/providers/AppProviders.tsx'),
      'utf8',
    );
    const auth = source.indexOf('<AuthProvider>');
    const season = source.indexOf('<SeasonParticipationProvider>');
    const closeAuth = source.indexOf('</AuthProvider>');

    expect(auth).toBeGreaterThan(-1);
    expect(season).toBeGreaterThan(auth);
    expect(season).toBeLessThan(closeAuth);
    expect(source).not.toContain('FlashcardSessionProvider');
  });
});
