import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '../../../shared/theme';
import { AuthPrimaryButton } from '../../auth/components/AuthPrimaryButton';
import { deriveSeasonSetupReview } from '../application/deriveSeasonSetupReview';
import { SeasonSetupScreenFrame } from '../components/SeasonSetupScreenFrame';
import { seasonSetupCopy } from '../copy/seasonSetupCopy';
import { useSeasonSetupChangeRegion } from '../hooks/useSeasonSetupChangeRegion';
import { useSeasonSetupGoBack } from '../hooks/useSeasonSetupGoBack';
import { useSeasonSetupSubmission } from '../state/SeasonSetupSubmissionProvider';
import { useSeasonSetup } from '../state/SeasonSetupProvider';

/**
 * Confirms Season, division or Study Track material, and Region.
 * Header Back returns to the previous screen. Change beside Region targets Region.
 * Confirm builds the participation request from the current wizard.
 */
export function ReviewScreen(): React.JSX.Element {
  const { wizard, regions, studyTrackChoices } = useSeasonSetup();
  const { submit, submissionError } = useSeasonSetupSubmission();
  const goBack = useSeasonSetupGoBack();
  const changeRegion = useSeasonSetupChangeRegion();
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
          <ReviewRegionRow
            testID="season-setup-review-region"
            caption={seasonSetupCopy.review.region}
            value={review.regionName}
            onChange={submitting || complete ? undefined : changeRegion}
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

function ReviewRegionRow({
  caption,
  value,
  testID,
  onChange,
}: {
  caption: string;
  value: string;
  testID: string;
  onChange?: () => void;
}): React.JSX.Element {
  return (
    <View accessible={false} style={styles.regionRow}>
      <View
        accessible
        accessibilityLabel={`${caption}, ${value}`}
        style={styles.regionSummary}
        testID={testID}
      >
        <Text style={styles.caption}>{caption}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
      {onChange ? (
        <Pressable
          accessibilityLabel={seasonSetupCopy.review.changeRegion}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onChange}
          style={({ pressed }) => [
            styles.changeRegion,
            pressed ? styles.changePressed : null,
          ]}
          testID="season-setup-review-change-region"
        >
          <Text style={styles.changeRegionLabel}>{seasonSetupCopy.review.change}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    gap: spacing.lg,
  },
  regionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  regionSummary: {
    flexShrink: 1,
  },
  changeRegion: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: spacing.minTouchTarget,
    minWidth: spacing.minTouchTarget,
    paddingHorizontal: spacing.sm,
  },
  changeRegionLabel: {
    ...typography.action,
  },
  changePressed: {
    opacity: 0.7,
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
