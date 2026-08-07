import {
  DEFAULT_FLASHCARD_SETTINGS,
  type CardSide,
  type CategoryFilterId,
  type FlashcardSettings,
} from '../types/settings';

export type FlashcardSettingsAction =
  | { type: 'setShuffleCards'; value: boolean }
  | { type: 'setDefaultSide'; value: CardSide }
  | { type: 'toggleCategoryFilter'; filterId: CategoryFilterId }
  | { type: 'clearCategoryFilters' }
  | { type: 'resetSettings' };

export const INITIAL_SETTINGS_STATE: FlashcardSettings = DEFAULT_FLASHCARD_SETTINGS;

function toggleFilter(
  filters: readonly CategoryFilterId[],
  filterId: CategoryFilterId,
): CategoryFilterId[] {
  if (filters.includes(filterId)) {
    return filters.filter((id) => id !== filterId);
  }
  return [...filters, filterId];
}

/** Pure settings transitions for in-session flashcard preferences. */
export function flashcardSettingsReducer(
  state: FlashcardSettings,
  action: FlashcardSettingsAction,
): FlashcardSettings {
  switch (action.type) {
    case 'setShuffleCards':
      return { ...state, shuffleCards: action.value };
    case 'setDefaultSide':
      return { ...state, defaultSide: action.value };
    case 'toggleCategoryFilter':
      return {
        ...state,
        categoryFilters: toggleFilter(state.categoryFilters, action.filterId),
      };
    case 'clearCategoryFilters':
      if (state.categoryFilters.length === 0) {
        return state;
      }
      return { ...state, categoryFilters: [] };
    case 'resetSettings':
      return INITIAL_SETTINGS_STATE;
    default:
      return state;
  }
}
