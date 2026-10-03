import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '../../../shared/theme';
import { AuthPrimaryButton } from '../../auth/components/AuthPrimaryButton';
import { SeasonSetupChoiceCard } from '../components/SeasonSetupChoiceCard';
import { SeasonSetupScreenFrame } from '../components/SeasonSetupScreenFrame';
import { seasonSetupCopy } from '../copy/seasonSetupCopy';
import { getDivisionLabel } from '../domain/division';
import { useSeasonSetupAdvance } from '../hooks/useSeasonSetupAdvance';
import { useSeasonSetupBackToAge } from '../hooks/useSeasonSetupBackToAge';
import { useSeasonSetup } from '../state/SeasonSetupProvider';

/**
 * First-year question for the ages the step plan includes.
 * Stores only the boolean. The division label is derived placement, not a local map.
 */
export function FirstYearScreen(): React.JSX.Element {
  const { wizard, steps, placement, setFirstYearQuizzer } = useSeasonSetup();
  const advance = useSeasonSetupAdvance();
  const backToAge = useSeasonSetupBackToAge();
  const applies = steps.steps.includes('firstYear');
  const answer = applies ? wizard.isFirstYearQuizzer : null;
  const divisionLabel =
    applies && placement.status === 'competitive'
      ? getDivisionLabel(placement.divisionId)
      : null;

  const handleContinue = () => {
    if (answer === null) {
      return;
    }
    advance({ type: 'setFirstYearQuizzer', isFirstYearQuizzer: answer });
  };

  return (
    <SeasonSetupScreenFrame
      title={seasonSetupCopy.firstYear.title}
      titleTestID="season-setup-first-year-title"
      onBack={backToAge}
    >
      {applies ? (
        <>
          <Text style={styles.question} testID="season-setup-first-year-question">
            {seasonSetupCopy.firstYear.question}
          </Text>
          <Text style={styles.helper}>{seasonSetupCopy.firstYear.helper}</Text>
          <View accessibilityRole="radiogroup" style={styles.choices}>
            <SeasonSetupChoiceCard
              testID="season-setup-choice-yes"
              label={seasonSetupCopy.firstYear.yes}
              selected={answer === true}
              onPress={() => {
                setFirstYearQuizzer(true);
              }}
            />
            <SeasonSetupChoiceCard
              testID="season-setup-choice-no"
              label={seasonSetupCopy.firstYear.no}
              selected={answer === false}
              onPress={() => {
                setFirstYearQuizzer(false);
              }}
            />
          </View>
          {divisionLabel !== null ? (
            <Text
              accessibilityLiveRegion="polite"
              style={styles.outcome}
              testID="season-setup-first-year-division"
            >
              {seasonSetupCopy.firstYear.divisionOutcome(divisionLabel)}
            </Text>
          ) : null}
        </>
      ) : (
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={styles.helper}
          testID="season-setup-first-year-unavailable"
        >
          {seasonSetupCopy.firstYear.unavailable}
        </Text>
      )}
      <AuthPrimaryButton
        testID="season-setup-first-year-continue"
        accentTone="auth"
        label={seasonSetupCopy.actions.continue}
        onPress={handleContinue}
        disabled={answer === null}
      />
    </SeasonSetupScreenFrame>
  );
}

const styles = StyleSheet.create({
  question: {
    ...typography.body,
  },
  helper: {
    ...typography.bodySecondary,
  },
  choices: {
    gap: spacing.md,
  },
  outcome: {
    ...typography.body,
  },
});
