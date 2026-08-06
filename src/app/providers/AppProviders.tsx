import { StatusBar } from 'expo-status-bar';
import React from 'react';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '../../shared/theme';

export interface AppProvidersProps {
  children: ReactNode;
}

/** App-wide providers only. Feature session state mounts with its route. */
export function AppProviders({ children }: AppProvidersProps): React.JSX.Element {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        {children}
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
