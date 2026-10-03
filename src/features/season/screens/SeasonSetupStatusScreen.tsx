import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { typography } from '../../../shared/theme';
import { AuthPrimaryButton } from '../../auth/components/AuthPrimaryButton';
import { SeasonSetupScreenFrame } from '../components/SeasonSetupScreenFrame';
import { seasonSetupCopy } from '../copy/seasonSetupCopy';

export interface SeasonSetupStatusScreenProps {
  title: string;
  titleTestID: string;
  busy?: boolean;
  message?: string;
  messageTestID?: string;
  retryLabel?: string;
  onRetry?: () => void;
}

/** Loading and catalog-unavailable states for Season Setup. */
export function SeasonSetupStatusScreen({
  title,
  titleTestID,
  busy = false,
  message,
  messageTestID,
  retryLabel,
  onRetry,
}: SeasonSetupStatusScreenProps): React.JSX.Element {
  return (
    <SeasonSetupScreenFrame title={title} titleTestID={titleTestID} busy={busy}>
      {message ? (
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={styles.message}
          testID={messageTestID}
        >
          {message}
        </Text>
      ) : null}
      {onRetry && retryLabel ? (
        <AuthPrimaryButton
          testID="season-setup-catalog-retry"
          accentTone="auth"
          label={retryLabel}
          onPress={onRetry}
        />
      ) : null}
    </SeasonSetupScreenFrame>
  );
}

const styles = StyleSheet.create({
  message: {
    ...typography.bodySecondary,
  },
});
