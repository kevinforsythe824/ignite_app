import {
  flashcardSettingsReducer,
  INITIAL_SETTINGS_STATE,
} from '../src/features/flashcards/state/flashcardSettingsReducer';

describe('flashcardSettingsReducer', () => {
  it('starts from the default settings', () => {
    expect(INITIAL_SETTINGS_STATE).toEqual({
      shuffleCards: false,
      defaultSide: 'locate',
      categoryFilters: [],
    });
  });

  it('toggles shuffle and default side', () => {
    let state = flashcardSettingsReducer(INITIAL_SETTINGS_STATE, {
      type: 'setShuffleCards',
      value: true,
    });
    state = flashcardSettingsReducer(state, { type: 'setDefaultSide', value: 'quote' });

    expect(state.shuffleCards).toBe(true);
    expect(state.defaultSide).toBe('quote');
  });

  it('toggles category filters on and off', () => {
    const withOne = flashcardSettingsReducer(INITIAL_SETTINGS_STATE, {
      type: 'toggleCategoryFilter',
      filterId: 'keyword1x',
    });
    expect(withOne.categoryFilters).toEqual(['keyword1x']);

    const withTwo = flashcardSettingsReducer(withOne, {
      type: 'toggleCategoryFilter',
      filterId: 'animals',
    });
    expect(withTwo.categoryFilters).toEqual(['keyword1x', 'animals']);

    const withStructural = flashcardSettingsReducer(withTwo, {
      type: 'toggleCategoryFilter',
      filterId: 'uniqueBeginning',
    });
    expect(withStructural.categoryFilters).toEqual([
      'keyword1x',
      'animals',
      'uniqueBeginning',
    ]);

    const withoutFirst = flashcardSettingsReducer(withStructural, {
      type: 'toggleCategoryFilter',
      filterId: 'keyword1x',
    });
    expect(withoutFirst.categoryFilters).toEqual(['animals', 'uniqueBeginning']);
  });

  it('clears all category filters at once', () => {
    const withFilters = flashcardSettingsReducer(
      flashcardSettingsReducer(INITIAL_SETTINGS_STATE, {
        type: 'toggleCategoryFilter',
        filterId: 'keyword1x',
      }),
      { type: 'toggleCategoryFilter', filterId: 'animals' },
    );
    expect(withFilters.categoryFilters).toEqual(['keyword1x', 'animals']);

    const cleared = flashcardSettingsReducer(withFilters, {
      type: 'clearCategoryFilters',
    });
    expect(cleared.categoryFilters).toEqual([]);

    // Idempotent when already empty.
    expect(
      flashcardSettingsReducer(cleared, { type: 'clearCategoryFilters' }),
    ).toBe(cleared);
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
