import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '../../../shared/theme';
import { AuthPrimaryButton } from '../../auth/components/AuthPrimaryButton';
import { SeasonSetupChoiceCard } from '../components/SeasonSetupChoiceCard';
import { SeasonSetupScreenFrame } from '../components/SeasonSetupScreenFrame';
import { seasonSetupCopy } from '../copy/seasonSetupCopy';
import { useSeasonSetupAdvance } from '../hooks/useSeasonSetupAdvance';
import { useSeasonSetupBackToAge } from '../hooks/useSeasonSetupBackToAge';
import { useSeasonSetup } from '../state/SeasonSetupProvider';
import { resolvePlacementChoices } from '../utils/resolvePlacementChoices';

/**
 * Multi-option competitive placement.
 * Renders only resolver-returned choices. A single derived division never lands here.
 */
export function PlacementChoiceScreen(): React.JSX.Element {
  const { wizard, steps, setCompetitiveDivision } = useSeasonSetup();
  const advance = useSeasonSetupAdvance();
  const backToAge = useSeasonSetupBackToAge();
  const resolved = resolvePlacementChoices(wizard.eligibilityAge);
  const choices = resolved.status === 'ready' ? resolved.choices : [];
  const applies = steps.steps.includes('placementChoice') && resolved.status === 'ready';
  const selected =
    choices.find((choice) => choice.divisionId === wizard.competitiveDivisionId)?.divisionId ??
    null;

  const handleContinue = () => {
    if (selected === null) {
      return;
    }
    advance({ type: 'setCompetitiveDivision', divisionId: selected });
  };

  return (
    <SeasonSetupScreenFrame
      title={seasonSetupCopy.placement.title}
      titleTestID="season-setup-placement-title"
      onBack={backToAge}
    >
      {applies ? (
        <>
          <Text style={styles.helper}>{seasonSetupCopy.placement.helper}</Text>
          <View accessibilityRole="radiogroup" style={styles.choices}>
            {choices.map((choice) => (
              <SeasonSetupChoiceCard
                key={choice.divisionId}
                testID={`season-setup-choice-${choice.divisionId}`}
                label={choice.label}
                selected={selected === choice.divisionId}
                onPress={() => {
                  setCompetitiveDivision(choice.divisionId);
                }}
              />
            ))}
          </View>
        </>
      ) : (
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={styles.helper}
          testID="season-setup-placement-unavailable"
        >
          {seasonSetupCopy.placement.unavailable}
        </Text>
      )}
      <AuthPrimaryButton
        testID="season-setup-placement-continue"
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
