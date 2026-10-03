import { fireEvent } from '@testing-library/react-native';

import { authCopy } from '../../../../src/features/auth/copy/authCopy';
import { seasonSetupCopy } from '../../../../src/features/season/copy/seasonSetupCopy';
import { OFFICIAL_REGIONS } from '../../../../src/features/season/domain/officialRegions';
import {
  listActiveRegionsByDisplayOrder,
  type OfficialRegionConfig,
} from '../../../../src/features/season/domain/region';
import { renderSeasonSetupFlow } from '../../../../test-utils/renderSeasonSetupFlow';

function withInactive(regionId: string): OfficialRegionConfig[] {
  return OFFICIAL_REGIONS.map((region) =>
    region.regionId === regionId ? { ...region, active: false } : region,
  );
}

async function openRegion(age: string, regions?: readonly OfficialRegionConfig[] | null) {
  const screen = await renderSeasonSetupFlow(regions === undefined ? {} : { regions });
  await fireEvent.changeText(await screen.findByTestId('season-setup-age-input'), age);
  await fireEvent.press(screen.getByTestId('season-setup-age-continue'));
  return screen;
}

describe('RegionScreen', () => {
  it('renders active regions in display order with coverage text', async () => {
    const screen = await openRegion('10');
    expect(await screen.findByRole('header', { name: seasonSetupCopy.region.title })).toBeTruthy();
    expect(screen.getByText(seasonSetupCopy.region.helper)).toBeTruthy();

    const radios = screen.getAllByRole('radio');
    const active = listActiveRegionsByDisplayOrder(OFFICIAL_REGIONS);
    expect(radios.map((radio) => radio.props.accessibilityLabel)).toEqual(
      active.map((region) => `${region.displayName}. ${region.coverageAreas.join(', ')}`),
    );
    expect(screen.getByText('Washington, Oregon, Idaho, Montana, Wyoming, Alaska')).toBeTruthy();
    expect(screen.getByTestId('season-setup-region-continue').props.accessibilityState.disabled).toBe(
      true,
    );
  });

  it('stores the region id and enables continue only after a selection', async () => {
    const screen = await openRegion('10');
    await screen.findByTestId('season-setup-region-title');

    await fireEvent.press(screen.getByTestId('season-setup-choice-northwest'));
    expect(screen.getByTestId('probe-region').props.children).toBe('northwest');
    expect(screen.getByTestId('probe-region').props.children).not.toBe('Northwest');
    expect(
      screen.getByTestId('season-setup-choice-northwest').props.accessibilityState.selected,
    ).toBe(true);
    expect(screen.getByText(seasonSetupCopy.choice.selected)).toBeTruthy();
    expect(screen.getByTestId('season-setup-region-continue').props.accessibilityState.disabled).toBe(
      false,
    );

    await fireEvent.press(screen.getByTestId('season-setup-choice-southwest'));
    expect(screen.getByTestId('probe-region').props.children).toBe('southwest');
    expect(
      screen.getByTestId('season-setup-choice-northwest').props.accessibilityState.selected,
    ).toBe(false);
    expect(
      screen.getByTestId('season-setup-choice-southwest').props.accessibilityState.selected,
    ).toBe(true);
  });

  it('omits an inactive region and fails closed when the catalog is unavailable', async () => {
    const inactive = await openRegion('10', withInactive('southeast'));
    expect(await inactive.findByTestId('season-setup-region-title')).toBeTruthy();
    expect(inactive.queryByText('Southeast')).toBeNull();
    expect(inactive.queryByTestId('season-setup-choice-southeast')).toBeNull();
    expect(inactive.getAllByRole('radio')).toHaveLength(OFFICIAL_REGIONS.length - 1);

    const unavailable = await openRegion('10', null);
    expect(await unavailable.findByTestId('season-setup-region-unavailable')).toBeTruthy();
    expect(unavailable.getByRole('alert').props.children).toBe(seasonSetupCopy.region.unavailable);
    expect(unavailable.queryByRole('radio')).toBeNull();
    expect(
      unavailable.getByTestId('season-setup-region-continue').props.accessibilityState.disabled,
    ).toBe(true);
    expect(unavailable.getByTestId('probe-region').props.children).toBe('none');
  });

  it('goes back to the previous step on the stack', async () => {
    const direct = await openRegion('10');
    await direct.findByTestId('season-setup-region-title');
    await fireEvent.press(direct.getByLabelText(authCopy.actions.back));
    expect(await direct.findByTestId('season-setup-age-input')).toBeTruthy();

    const placed = await openRegion('3');
    await placed.findByTestId('season-setup-placement-title');
    await fireEvent.press(placed.getByTestId('season-setup-choice-cadet'));
    await fireEvent.press(placed.getByTestId('season-setup-placement-continue'));
    await placed.findByTestId('season-setup-region-title');
    await fireEvent.press(placed.getByLabelText(authCopy.actions.back));
    expect(await placed.findByTestId('season-setup-placement-title')).toBeTruthy();
  });
});
