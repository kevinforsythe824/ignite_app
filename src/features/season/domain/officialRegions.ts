import type { OfficialRegionConfig } from './region';

/**
 * Official WPF Regions.
 * Ids are assigned stable tokens. Display names are not turned into ids here.
 * Participation stores regionId only.
 */

function officialRegion(
  regionId: string,
  displayName: string,
  coverageAreas: readonly string[],
  displayOrder: number,
): OfficialRegionConfig {
  return Object.freeze({
    regionId,
    displayName,
    coverageAreas: Object.freeze(coverageAreas.slice()),
    displayOrder,
    active: true,
  });
}

export const OFFICIAL_REGIONS: readonly OfficialRegionConfig[] = Object.freeze([
  officialRegion('western-canada', 'Western Canada', [
    'British Columbia',
    'Alberta',
    'Saskatchewan',
  ], 1),
  officialRegion('northwest', 'Northwest', [
    'Washington',
    'Oregon',
    'Idaho',
    'Montana',
    'Wyoming',
    'Alaska',
  ], 2),
  officialRegion('southwest', 'Southwest', [
    'California',
    'Nevada',
    'Arizona',
    'Utah',
  ], 3),
  officialRegion('northcentral', 'Northcentral', [
    'North Dakota',
    'South Dakota',
    'Minnesota',
    'Wisconsin',
    'Illinois',
  ], 4),
  officialRegion('central', 'Central', [
    'Colorado',
    'Nebraska',
    'Kansas',
    'Oklahoma',
    'Iowa',
    'Missouri',
    'Arkansas',
  ], 5),
  officialRegion('southcentral', 'Southcentral', [
    'New Mexico',
    'Texas',
    'Louisiana',
    'Mississippi',
  ], 6),
  officialRegion('northeast', 'Northeast', [
    'Michigan',
    'Indiana',
    'Kentucky',
    'Ohio',
    'West Virginia',
    'New York',
    'Pennsylvania',
    'Maryland',
    'Delaware',
    'Virginia',
    'Vermont',
    'New Hampshire',
    'Maine',
    'Massachusetts',
    'Connecticut',
    'Rhode Island',
    'New Jersey',
  ], 7),
  officialRegion('southeast', 'Southeast', [
    'Tennessee',
    'North Carolina',
    'South Carolina',
    'Alabama',
    'Georgia',
    'Florida',
  ], 8),
]);
