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

/**
 * Study Track material choice.
 * The selected value is the injected opaque materialSetId.
 */
export function StudyTrackScreen(): React.JSX.Element {
  const { wizard, steps, studyTrackChoices, setStudyTrackMaterialSet } = useSeasonSetup();
  const advance = useSeasonSetupAdvance();
  const backToAge = useSeasonSetupBackToAge();
  const choices = studyTrackChoices.status === 'ready' ? studyTrackChoices.choices : [];
  const applies = steps.steps.includes('studyTrack') && studyTrackChoices.status === 'ready';
  const selected =
    choices.find((choice) => choice.materialSetId === wizard.studyTrackMaterialSetId)
      ?.materialSetId ?? null;

  const handleContinue = () => {
    if (selected === null) {
      return;
    }
    advance({ type: 'setStudyTrackMaterialSet', studyTrackMaterialSetId: selected });
  };

  return (
    <SeasonSetupScreenFrame
      title={seasonSetupCopy.studyTrack.title}
      titleTestID="season-setup-study-track-title"
      onBack={backToAge}
    >
      {applies ? (
        <>
          <Text style={styles.body}>{seasonSetupCopy.studyTrack.body}</Text>
          <Text style={styles.helper}>{seasonSetupCopy.studyTrack.helper}</Text>
          <View accessibilityRole="radiogroup" style={styles.choices}>
            {choices.map((choice) => (
              <SeasonSetupChoiceCard
                key={choice.materialSetId}
                testID={`season-setup-choice-${choice.materialSetId}`}
                label={choice.label}
                selected={selected === choice.materialSetId}
                onPress={() => {
                  setStudyTrackMaterialSet(choice.materialSetId);
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
          testID="season-setup-study-track-unavailable"
        >
          {seasonSetupCopy.studyTrack.unavailable}
        </Text>
      )}
      <AuthPrimaryButton
        testID="season-setup-study-track-continue"
        accentTone="auth"
        label={seasonSetupCopy.actions.continue}
        onPress={handleContinue}
        disabled={!applies || selected === null}
      />
    </SeasonSetupScreenFrame>
  );
}

const styles = StyleSheet.create({
  body: {
    ...typography.body,
  },
  helper: {
    ...typography.bodySecondary,
  },
  choices: {
    gap: spacing.md,
  },
});
