import { OFFICIAL_REGIONS } from '../../../../src/features/season/domain/officialRegions';
import {
  findActiveRegionById,
  isValidOfficialRegionConfig,
  listActiveRegionsByDisplayOrder,
  type OfficialRegionConfig,
} from '../../../../src/features/season/domain/region';

const APPROVED_REGIONS: readonly OfficialRegionConfig[] = [
  {
    regionId: 'western-canada',
    displayName: 'Western Canada',
    coverageAreas: ['British Columbia', 'Alberta', 'Saskatchewan'],
    displayOrder: 1,
    active: true,
  },
  {
    regionId: 'northwest',
    displayName: 'Northwest',
    coverageAreas: ['Washington', 'Oregon', 'Idaho', 'Montana', 'Wyoming', 'Alaska'],
    displayOrder: 2,
    active: true,
  },
  {
    regionId: 'southwest',
    displayName: 'Southwest',
    coverageAreas: ['California', 'Nevada', 'Arizona', 'Utah'],
    displayOrder: 3,
    active: true,
  },
  {
    regionId: 'northcentral',
    displayName: 'Northcentral',
    coverageAreas: ['North Dakota', 'South Dakota', 'Minnesota', 'Wisconsin', 'Illinois'],
    displayOrder: 4,
    active: true,
  },
  {
    regionId: 'central',
    displayName: 'Central',
    coverageAreas: [
      'Colorado',
      'Nebraska',
      'Kansas',
      'Oklahoma',
      'Iowa',
      'Missouri',
      'Arkansas',
    ],
    displayOrder: 5,
    active: true,
  },
  {
    regionId: 'southcentral',
    displayName: 'Southcentral',
    coverageAreas: ['New Mexico', 'Texas', 'Louisiana', 'Mississippi'],
    displayOrder: 6,
    active: true,
  },
  {
    regionId: 'northeast',
    displayName: 'Northeast',
    coverageAreas: [
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
    ],
    displayOrder: 7,
    active: true,
  },
  {
    regionId: 'southeast',
    displayName: 'Southeast',
    coverageAreas: [
      'Tennessee',
      'North Carolina',
      'South Carolina',
      'Alabama',
      'Georgia',
      'Florida',
    ],
    displayOrder: 8,
    active: true,
  },
];

const REGION_FIELDS = ['active', 'coverageAreas', 'displayName', 'displayOrder', 'regionId'];

describe('official WPF regions', () => {
  it('lists exactly eight active regions with the assigned ids and coverage', () => {
    expect(OFFICIAL_REGIONS).toHaveLength(8);
    expect(OFFICIAL_REGIONS.map((region) => region.regionId)).toEqual(
      APPROVED_REGIONS.map((region) => region.regionId),
    );
    expect(listActiveRegionsByDisplayOrder(OFFICIAL_REGIONS)).toEqual(APPROVED_REGIONS);
    for (const region of OFFICIAL_REGIONS) {
      expect(region.active).toBe(true);
      expect(isValidOfficialRegionConfig(region)).toBe(true);
      expect(Object.keys(region).sort()).toEqual(REGION_FIELDS);
      expect(Array.isArray(region.coverageAreas)).toBe(true);
    }
  });

  it('orders active regions by displayOrder and drops inactive ones', () => {
    const shuffled = [...OFFICIAL_REGIONS].reverse();
    const withInactive = shuffled.map((region) =>
      region.regionId === 'southeast' ? { ...region, active: false } : region,
    );
    const ordered = listActiveRegionsByDisplayOrder(withInactive);
    expect(ordered.map((region) => region.regionId)).toEqual([
      'western-canada',
      'northwest',
      'southwest',
      'northcentral',
      'central',
      'southcentral',
      'northeast',
    ]);
    expect(shuffled.map((region) => region.regionId)).toEqual(
      [...OFFICIAL_REGIONS].reverse().map((region) => region.regionId),
    );
  });

  it('breaks displayOrder ties by regionId', () => {
    const tied: OfficialRegionConfig[] = [
      {
        regionId: 'b-region',
        displayName: 'B',
        coverageAreas: ['One'],
        displayOrder: 5,
        active: true,
      },
      {
        regionId: 'a-region',
        displayName: 'A',
        coverageAreas: ['Two'],
        displayOrder: 5,
        active: true,
      },
    ];
    expect(listActiveRegionsByDisplayOrder(tied).map((region) => region.regionId)).toEqual([
      'a-region',
      'b-region',
    ]);
  });

  it('finds an active region by assigned id, not by display name', () => {
    expect(findActiveRegionById(OFFICIAL_REGIONS, 'northwest')?.displayName).toBe('Northwest');
    expect(findActiveRegionById(OFFICIAL_REGIONS, 'Western Canada')).toBeUndefined();
    expect(findActiveRegionById(OFFICIAL_REGIONS, 'western canada')).toBeUndefined();

    const renamed: OfficialRegionConfig = {
      regionId: 'northwest',
      displayName: 'Not A Slug Source',
      coverageAreas: ['Washington'],
      displayOrder: 2,
      active: true,
    };
    expect(findActiveRegionById([renamed], 'northwest')?.displayName).toBe('Not A Slug Source');
    expect(findActiveRegionById([renamed], 'not-a-slug-source')).toBeUndefined();
  });

  it('does not return an inactive region for its id', () => {
    const inactive: OfficialRegionConfig = {
      ...APPROVED_REGIONS[1]!,
      active: false,
    };
    expect(findActiveRegionById([inactive], 'northwest')).toBeUndefined();
  });

  it('rejects a coverage string and other invalid config records', () => {
    const valid = APPROVED_REGIONS[2]!;
    expect(
      isValidOfficialRegionConfig({
        ...valid,
        coverageAreas: 'California, Nevada, Arizona, Utah',
      }),
    ).toBe(false);
    expect(isValidOfficialRegionConfig({ ...valid, coverageAreas: [] })).toBe(false);
    expect(isValidOfficialRegionConfig({ ...valid, regionId: ' ' })).toBe(false);
    expect(isValidOfficialRegionConfig({ ...valid, displayOrder: 0 })).toBe(false);
    expect(isValidOfficialRegionConfig({ ...valid, active: 'yes' })).toBe(false);
    expect(isValidOfficialRegionConfig({ ...valid, active: false })).toBe(true);
    expect(isValidOfficialRegionConfig({ ...valid, leadershipContact: 'hidden' })).toBe(false);
  });
});
