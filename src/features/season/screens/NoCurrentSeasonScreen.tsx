import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { typography } from '../../../shared/theme';
import { SeasonSetupScreenFrame } from '../components/SeasonSetupScreenFrame';
import { noCurrentSeasonCopy } from '../copy/noCurrentSeasonCopy';

/** Shown when no Season is current. Does not enter Study. */
export function NoCurrentSeasonScreen(): React.JSX.Element {
  return (
    <SeasonSetupScreenFrame
      title={noCurrentSeasonCopy.title}
      titleTestID="no-current-season-title"
    >
      <Text style={styles.body} testID="no-current-season-body">
        {noCurrentSeasonCopy.body}
      </Text>
    </SeasonSetupScreenFrame>
  );
}

const styles = StyleSheet.create({
  body: {
    ...typography.bodySecondary,
  },
});
