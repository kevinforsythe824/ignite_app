import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../../../shared/theme';
import { quizzerProfileCopy } from '../copy/quizzerProfileCopy';

/** Non-MainTabs loading cover while account lifecycle is resolving. */
export function QuizzerProfileLoadingScreen(): React.JSX.Element {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View
        style={styles.body}
        accessibilityLabel={quizzerProfileCopy.loading.accessibilityLabel}
        accessibilityRole="progressbar"
        testID="quizzer-profile-loading"
      >
        <ActivityIndicator color={colors.navy} size="large" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.authBackgroundStart,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
