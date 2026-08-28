import { StatusBar } from 'expo-status-bar';
import React from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '../../features/auth';
import { ParentalConsentProvider } from '../../features/parentalConsent';
import { QuizzerProfileProvider } from '../../features/profile/state/QuizzerProfileProvider';
import { colors, useIgniteFonts } from '../../shared/theme';

export interface AppProvidersProps {
  children: ReactNode;
}

/** App-wide providers only. Feature session state mounts with its route. */
export function AppProviders({ children }: AppProvidersProps): React.JSX.Element {
  const fontsLoaded = useIgniteFonts();

  if (!fontsLoaded) {
    return <View style={styles.root} />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AuthProvider>
          <ParentalConsentProvider>
            <QuizzerProfileProvider>{children}</QuizzerProfileProvider>
          </ParentalConsentProvider>
        </AuthProvider>
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
