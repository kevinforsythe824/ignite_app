import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../../shared/theme';
import { authCopy } from '../copy/authCopy';
import { AUTH_BRAND_ICON_SIZE } from './authLayout';
import { igniteFlameSource } from './igniteFlameAsset';

export type IgniteBrandMarkSize = 'header' | 'default' | 'entry' | 'welcome';

export interface IgniteBrandMarkProps {
  /** Explicit flame size in points. Overrides `size` when provided. */
  iconSize?: number;
  /** Named size variant for splash/entry/welcome/form headers. */
  size?: IgniteBrandMarkSize;
  /** When false, renders flame only (native splash twin). Default true. */
  showWordmark?: boolean;
}

const SIZE_MAP: Record<IgniteBrandMarkSize, number> = {
  header: 40,
  default: AUTH_BRAND_ICON_SIZE,
  entry: 96,
  welcome: 120,
};

export function IgniteBrandMark({
  iconSize,
  size = 'default',
  showWordmark = true,
}: IgniteBrandMarkProps): React.JSX.Element {
  const flameSize = iconSize ?? SIZE_MAP[size];

  return (
    <View
      style={styles.mark}
      accessibilityRole="image"
      accessibilityLabel={authCopy.brand.accessibilityLabel}
    >
      <Image
        source={igniteFlameSource}
        accessibilityIgnoresInvertColors
        resizeMode="contain"
        style={{ width: flameSize, height: flameSize }}
      />
      {showWordmark ? (
        <Text style={[styles.name, size === 'header' ? styles.nameHeader : null]}>
          {authCopy.brand.name}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    ...typography.brandWordmark,
    color: colors.navy,
  },
  nameHeader: {
    ...typography.verseReference,
    fontFamily: typography.brandWordmark.fontFamily,
  },
});
