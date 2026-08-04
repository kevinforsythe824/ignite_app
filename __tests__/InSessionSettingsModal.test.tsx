import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import InSessionSettingsModal from '../src/components/flashcards/InSessionSettingsModal';

describe('InSessionSettingsModal', () => {
  it('renders the Session Settings header when visible', () => {
    let renderer!: ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <SafeAreaProvider>
          <InSessionSettingsModal visible onClose={() => undefined} />
        </SafeAreaProvider>,
      );
    });

    const titles = renderer.root.findAll(
      (node) =>
        typeof node.props.children === 'string' && node.props.children === 'Session Settings',
    );

    expect(titles.length).toBeGreaterThan(0);
  });

  it('invokes onClose when the close button is pressed', () => {
    const onClose = jest.fn();
    let renderer!: ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <SafeAreaProvider>
          <InSessionSettingsModal visible onClose={onClose} />
        </SafeAreaProvider>,
      );
    });

    const closeButton = renderer.root.findByProps({ accessibilityLabel: 'Close session settings' });

    act(() => {
      closeButton.props.onPress();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
