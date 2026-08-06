import React from 'react';

import { AppProviders, RootNavigator } from './src/app';

export default function App(): React.JSX.Element {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}
