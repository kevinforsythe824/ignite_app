import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '../../../shared/theme';
import { deriveInitials } from '../utils/deriveInitials';
import { quizzerProfileCopy } from '../copy/quizzerProfileCopy';

const AVATAR_SIZE = 76;
// iOS stacks a Text's leading above the baseline, so screenTitle's 34pt line box lifts the
// initials off the circle's center. Nunito Sans ExtraBold centers its cap height when the line
// box equals capHeight + 2x descent (0.705em + 2 x 0.353em at 28pt).
const INITIALS_LINE_HEIGHT = 40;

export interface QuizzerAvatarProps {
  firstName: string;
  lastName: string;
}

/** Initials presentation for QuizzerProfile. Does not persist initials. */
export function QuizzerAvatar({ firstName, lastName }: QuizzerAvatarProps): React.JSX.Element {
  const initials = deriveInitials(firstName, lastName);
  const fullName = `${firstName} ${lastName}`.trim() || 'Quizzer';

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={quizzerProfileCopy.profile.avatarAccessibilityLabel(fullName)}
      style={styles.avatar}
      testID="quizzer-avatar"
    >
      <Text style={styles.initials} testID="quizzer-avatar-initials">
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    ...typography.screenTitle,
    color: colors.surface,
    lineHeight: INITIALS_LINE_HEIGHT,
    includeFontPadding: false,
  },
});
