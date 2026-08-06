import {
  flashcardSettingsReducer,
  INITIAL_SETTINGS_STATE,
} from '../src/features/flashcards/state/flashcardSettingsReducer';

describe('flashcardSettingsReducer', () => {
  it('starts from the default settings', () => {
    expect(INITIAL_SETTINGS_STATE).toEqual({
      shuffleCards: false,
      playAudio: false,
      defaultSide: 'locate',
      categoryFilters: [],
    });
  });

  it('toggles shuffle, audio, and default side', () => {
    let state = flashcardSettingsReducer(INITIAL_SETTINGS_STATE, {
      type: 'setShuffleCards',
      value: true,
    });
    state = flashcardSettingsReducer(state, { type: 'setPlayAudio', value: true });
    state = flashcardSettingsReducer(state, { type: 'setDefaultSide', value: 'quote' });

    expect(state.shuffleCards).toBe(true);
    expect(state.playAudio).toBe(true);
    expect(state.defaultSide).toBe('quote');
  });

  it('toggles category filters on and off', () => {
    const withOne = flashcardSettingsReducer(INITIAL_SETTINGS_STATE, {
      type: 'toggleCategoryFilter',
      filterId: 'uniqueBeginning',
    });
    expect(withOne.categoryFilters).toEqual(['uniqueBeginning']);

    const withTwo = flashcardSettingsReducer(withOne, {
      type: 'toggleCategoryFilter',
      filterId: 'question',
    });
    expect(withTwo.categoryFilters).toEqual(['uniqueBeginning', 'question']);

    const withoutFirst = flashcardSettingsReducer(withTwo, {
      type: 'toggleCategoryFilter',
      filterId: 'uniqueBeginning',
    });
    expect(withoutFirst.categoryFilters).toEqual(['question']);
  });

  it('resets settings to defaults', () => {
    const dirty = flashcardSettingsReducer(INITIAL_SETTINGS_STATE, {
      type: 'setShuffleCards',
      value: true,
    });

    expect(flashcardSettingsReducer(dirty, { type: 'resetSettings' })).toEqual(
      INITIAL_SETTINGS_STATE,
    );
  });
});
