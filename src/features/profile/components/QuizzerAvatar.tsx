import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '../../../shared/theme';
import { deriveInitials } from '../utils/deriveInitials';
import { quizzerProfileCopy } from '../copy/quizzerProfileCopy';

const AVATAR_SIZE = 88;

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
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    ...typography.title,
    color: colors.cardWhite,
    fontSize: 28,
    lineHeight: 34,
  },
});
