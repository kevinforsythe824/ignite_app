import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '../../../shared/theme';
import { AuthPrimaryButton } from '../../auth/components/AuthPrimaryButton';
import { deriveSeasonSetupReview } from '../application/deriveSeasonSetupReview';
import { SeasonSetupScreenFrame } from '../components/SeasonSetupScreenFrame';
import { seasonSetupCopy } from '../copy/seasonSetupCopy';
import { useSeasonSetupGoBack } from '../hooks/useSeasonSetupGoBack';
import { useSeasonSetupSubmission } from '../state/SeasonSetupSubmissionProvider';
import { useSeasonSetup } from '../state/SeasonSetupProvider';

/**
 * Confirms Season, division or Study Track material, and Region.
 * Confirm builds the participation request from the current wizard.
 */
export function ReviewScreen(): React.JSX.Element {
  const { wizard, regions, studyTrackChoices } = useSeasonSetup();
  const { submit, submissionError } = useSeasonSetupSubmission();
  const goBack = useSeasonSetupGoBack();
  const review = deriveSeasonSetupReview(wizard, regions, studyTrackChoices);
  const submitting = wizard.submission.status === 'submitting';
  const complete = wizard.submission.status === 'complete';
  const ready = review.status === 'ready';
  const materialCaption =
    review.status === 'ready'
      ? review.materialKind === 'division'
        ? seasonSetupCopy.review.division
        : seasonSetupCopy.review.studyMaterial
      : null;

  return (
    <SeasonSetupScreenFrame
      title={seasonSetupCopy.review.title}
      titleTestID="season-setup-review-title"
      onBack={submitting || complete ? undefined : goBack}
    >
      {ready && materialCaption ? (
        <View style={styles.summary}>
          <ReviewRow
            testID="season-setup-review-season"
            caption={seasonSetupCopy.review.season}
            value={review.seasonLabel}
          />
          <ReviewRow
            testID="season-setup-review-material"
            caption={materialCaption}
            value={review.materialLabel}
          />
          <ReviewRow
            testID="season-setup-review-region"
            caption={seasonSetupCopy.review.region}
            value={review.regionName}
          />
        </View>
      ) : (
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={styles.body}
          testID="season-setup-review-unavailable"
        >
          {seasonSetupCopy.review.unavailable}
        </Text>
      )}
      {submissionError ? (
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={styles.body}
          testID="season-setup-review-error"
        >
          {submissionError.message}
        </Text>
      ) : null}
      {complete ? (
        <Text
          accessibilityLiveRegion="polite"
          style={styles.body}
          testID="season-setup-review-complete"
        >
          {seasonSetupCopy.review.complete}
        </Text>
      ) : null}
      <AuthPrimaryButton
        testID="season-setup-review-confirm"
        accentTone="auth"
        label={seasonSetupCopy.review.confirm}
        loadingLabel={seasonSetupCopy.review.confirming}
        loading={submitting}
        onPress={() => {
          void submit();
        }}
        disabled={!ready || complete}
      />
    </SeasonSetupScreenFrame>
  );
}

function ReviewRow({
  caption,
  value,
  testID,
}: {
  caption: string;
  value: string;
  testID: string;
}): React.JSX.Element {
  return (
    <View accessible accessibilityLabel={`${caption}, ${value}`} testID={testID}>
      <Text style={styles.caption}>{caption}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    gap: spacing.lg,
  },
  caption: {
    ...typography.label,
  },
  value: {
    ...typography.body,
  },
  body: {
    ...typography.bodySecondary,
  },
});
