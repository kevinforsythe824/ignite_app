import React, { useEffect } from 'react';

import { AppProviders, RootNavigator } from './src/app';
import { prepareNativeSplash } from './src/features/auth/splash/nativeSplash';

void prepareNativeSplash();

export default function App(): React.JSX.Element {
  useEffect(() => {
    void prepareNativeSplash();
  }, []);

  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}
