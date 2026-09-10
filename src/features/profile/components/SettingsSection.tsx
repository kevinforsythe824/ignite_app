import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, typography } from '../../../shared/theme';
import { settingsRowLayout } from './SettingsRow';

const CARD_BORDER_WIDTH = 1;

export interface SettingsSectionProps {
  /** Optional bold in-card section title (Settings reference grouped card). */
  title?: string;
  children: React.ReactNode;
  testID?: string;
}

/** Grouped white card shell: optional in-card title above inset-separated rows. */
export function SettingsSection({
  title,
  children,
  testID,
}: SettingsSectionProps): React.JSX.Element {
  const rows = React.Children.toArray(children).filter(React.isValidElement);

  return (
    <View style={styles.card} testID={testID}>
      {title ? (
        <View style={styles.titleBlock}>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
        </View>
      ) : null}
      {title && rows.length > 0 ? <View style={styles.separator} /> : null}
      {rows.map((row, index) => (
        <React.Fragment key={row.key ?? index}>
          {index > 0 ? <View style={styles.separator} /> : null}
          {row}
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: CARD_BORDER_WIDTH,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  titleBlock: {
    paddingHorizontal: settingsRowLayout.paddingHorizontal,
    paddingVertical: settingsRowLayout.paddingVertical,
  },
  title: {
    ...typography.cardTitle,
    color: colors.textPrimary,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: settingsRowLayout.paddingHorizontal,
  },
});
