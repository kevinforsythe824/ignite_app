import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '../../../shared/theme';
import { AuthPrimaryButton } from '../../auth/components/AuthPrimaryButton';
import { SeasonSetupChoiceCard } from '../components/SeasonSetupChoiceCard';
import { SeasonSetupScreenFrame } from '../components/SeasonSetupScreenFrame';
import { seasonSetupCopy } from '../copy/seasonSetupCopy';
import { listActiveRegionsByDisplayOrder } from '../domain/region';
import { useSeasonSetupAdvance } from '../hooks/useSeasonSetupAdvance';
import { useSeasonSetupGoBack } from '../hooks/useSeasonSetupGoBack';
import { useSeasonSetup } from '../state/SeasonSetupProvider';

function coverageText(areas: readonly string[]): string {
  return areas.join(', ');
}

/**
 * Active Region choice. The stored value is the catalog regionId.
 */
export function RegionScreen(): React.JSX.Element {
  const { wizard, regions, setRegion } = useSeasonSetup();
  const advance = useSeasonSetupAdvance();
  const goBack = useSeasonSetupGoBack();
  const choices = listActiveRegionsByDisplayOrder(regions ?? []);
  const applies = choices.length > 0;
  const selected = choices.find((region) => region.regionId === wizard.regionId) ?? null;

  const handleContinue = () => {
    if (selected === null) {
      return;
    }
    advance({ type: 'setRegion', regionId: selected.regionId });
  };

  return (
    <SeasonSetupScreenFrame
      title={seasonSetupCopy.region.title}
      titleTestID="season-setup-region-title"
      onBack={goBack}
    >
      {applies ? (
        <>
          <Text style={styles.helper}>{seasonSetupCopy.region.helper}</Text>
          <View accessibilityRole="radiogroup" style={styles.choices}>
            {choices.map((region) => {
              const coverage = coverageText(region.coverageAreas);
              return (
                <SeasonSetupChoiceCard
                  key={region.regionId}
                  testID={`season-setup-choice-${region.regionId}`}
                  label={region.displayName}
                  supportingText={coverage}
                  selected={selected?.regionId === region.regionId}
                  onPress={() => {
                    setRegion(region.regionId);
                  }}
                />
              );
            })}
          </View>
        </>
      ) : (
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={styles.helper}
          testID="season-setup-region-unavailable"
        >
          {seasonSetupCopy.region.unavailable}
        </Text>
      )}
      <AuthPrimaryButton
        testID="season-setup-region-continue"
        accentTone="auth"
        label={seasonSetupCopy.actions.continue}
        onPress={handleContinue}
        disabled={!applies || selected === null}
      />
    </SeasonSetupScreenFrame>
  );
}

const styles = StyleSheet.create({
  helper: {
    ...typography.bodySecondary,
  },
  choices: {
    gap: spacing.md,
  },
});
