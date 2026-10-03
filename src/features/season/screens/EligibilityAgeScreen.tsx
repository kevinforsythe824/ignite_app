import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { typography } from '../../../shared/theme';
import { AuthPrimaryButton } from '../../auth/components/AuthPrimaryButton';
import { AuthTextField } from '../../auth/components/AuthTextField';
import { canAdvanceFromEligibilityAge } from '../application/canAdvanceFromEligibilityAge';
import { seasonSetupJanuaryFirstQuestion } from '../application/seasonSetupJanuaryFirstQuestion';
import { SeasonSetupScreenFrame } from '../components/SeasonSetupScreenFrame';
import { seasonSetupCopy } from '../copy/seasonSetupCopy';
import { useSeasonSetupAdvance } from '../hooks/useSeasonSetupAdvance';
import { useSeasonSetupSessionNavigationReset } from '../hooks/useSeasonSetupSessionNavigationReset';
import { useSeasonSetup } from '../state/SeasonSetupProvider';
import { parseEligibilityAgeInput } from '../utils/parseEligibilityAgeInput';

/**
 * Collects a January 1 eligibility age.
 * Continue follows canAdvanceFromEligibilityAge. There is no birthday field.
 */
export function EligibilityAgeScreen(): React.JSX.Element {
  const { seasonId, calendarDate, wizard, setEligibilityAge } = useSeasonSetup();
  const advance = useSeasonSetupAdvance();
  useSeasonSetupSessionNavigationReset();
  const [text, setText] = useState(() =>
    wizard.eligibilityAge === null ? '' : String(wizard.eligibilityAge),
  );
  const [touched, setTouched] = useState(false);
  const acceptedAgeRef = useRef<number | null>(wizard.eligibilityAge);
  const seasonRef = useRef(seasonId);

  useEffect(() => {
    const ageChanged = wizard.eligibilityAge !== acceptedAgeRef.current;
    const seasonChanged = seasonId !== seasonRef.current;
    if (!ageChanged && !seasonChanged) {
      return;
    }
    acceptedAgeRef.current = wizard.eligibilityAge;
    seasonRef.current = seasonId;
    setText(wizard.eligibilityAge === null ? '' : String(wizard.eligibilityAge));
    setTouched(false);
  }, [wizard.eligibilityAge, seasonId]);

  const question =
    seasonId === null
      ? ({ status: 'invalid', reason: 'seasonYear' } as const)
      : seasonSetupJanuaryFirstQuestion(seasonId, calendarDate);
  const questionReady = question.status === 'question';
  const parsed = parseEligibilityAgeInput(text);
  const canContinue =
    questionReady &&
    parsed.status === 'integer' &&
    canAdvanceFromEligibilityAge(parsed.age);

  const showError = questionReady && touched && !canContinue;
  const error = !showError
    ? undefined
    : parsed.status === 'integer'
      ? seasonSetupCopy.age.cannotContinue
      : seasonSetupCopy.age.wholeNumber;

  const handleChange = (value: string) => {
    setText(value);
    setTouched(true);
    const next = parseEligibilityAgeInput(value);
    if (next.status !== 'integer') {
      return;
    }
    acceptedAgeRef.current = next.age;
    setEligibilityAge(next.age);
  };

  const handleContinue = () => {
    setTouched(true);
    if (!questionReady || parsed.status !== 'integer' || !canAdvanceFromEligibilityAge(parsed.age)) {
      return;
    }
    acceptedAgeRef.current = parsed.age;
    advance({ type: 'setEligibilityAge', eligibilityAge: parsed.age });
  };

  return (
    <SeasonSetupScreenFrame
      title={seasonSetupCopy.age.title}
      titleTestID="season-setup-age-title"
    >
      {question.status === 'question' ? (
        <>
          <Text style={styles.question} testID="season-setup-age-question">
            {question.text}
          </Text>
          <Text style={styles.helper}>{seasonSetupCopy.age.helper}</Text>
          <AuthTextField
            appearance="system"
            label={seasonSetupCopy.age.fieldLabel}
            value={text}
            onChangeText={handleChange}
            error={error}
            keyboardType="number-pad"
            inputMode="numeric"
            autoCorrect={false}
            autoCapitalize="none"
            onBlur={() => {
              setTouched(true);
            }}
            onSubmitEditing={handleContinue}
            testID="season-setup-age-input"
          />
        </>
      ) : (
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={styles.helper}
          testID="season-setup-age-unavailable"
        >
          {seasonSetupCopy.age.unavailable}
        </Text>
      )}
      <AuthPrimaryButton
        testID="season-setup-age-continue"
        accentTone="auth"
        label={seasonSetupCopy.actions.continue}
        onPress={handleContinue}
        disabled={!canContinue}
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
});
