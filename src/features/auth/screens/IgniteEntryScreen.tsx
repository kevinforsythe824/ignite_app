import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../../../shared/theme';

/**
 * Minimal warm cover while authentication is initializing.
 * Continuity with the native splash (solid authBackgroundStart). Does not delay
 * routing; unmounts as soon as the session resolves. No Ignite branding.
 */
export function IgniteEntryScreen(): React.JSX.Element {
  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top', 'bottom']}
      testID="ignite-entry"
    />
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.authBackgroundStart,
  },
});
