import { createContext, useContext } from 'react';

import type { SeasonSetupRegionBoundary } from './types';

export interface SeasonSetupBoundaryContextValue {
  onReachedRegionBoundary?: (boundary: SeasonSetupRegionBoundary) => void;
}

const SeasonSetupBoundaryContext = createContext<SeasonSetupBoundaryContextValue>({});

export const SeasonSetupBoundaryProvider = SeasonSetupBoundaryContext.Provider;

export function useSeasonSetupBoundary(): SeasonSetupBoundaryContextValue {
  return useContext(SeasonSetupBoundaryContext);
}
