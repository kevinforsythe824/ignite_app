import { StatusBar } from 'expo-status-bar';
import React from 'react';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FlashcardSessionProvider } from '../../features/flashcards/state/FlashcardSessionContext';
import { colors } from '../../shared/theme';

export interface AppProvidersProps {
  children: ReactNode;
}

/** Root providers required by navigation, gestures, and flashcard sessions. */
export function AppProviders({ children }: AppProvidersProps): React.JSX.Element {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <FlashcardSessionProvider>
          <StatusBar style="dark" />
          {children}
        </FlashcardSessionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

export default AppProviders;
