jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    Ionicons: ({ name }) => React.createElement(Text, null, name),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  const actual = jest.requireActual('react-native-safe-area-context');

  const insets = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { x: 0, y: 0, width: 390, height: 844 };
  const initialMetrics = { frame, insets };

  return {
    ...actual,
    // Keep a real provider so React Navigation's SafeAreaProviderCompat works.
    SafeAreaProvider: ({ children, initialMetrics: metrics = initialMetrics }) =>
      React.createElement(actual.SafeAreaProvider, { initialMetrics: metrics }, children),
    SafeAreaView: View,
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => frame,
    initialWindowMetrics: initialMetrics,
  };
});

jest.mock('react-native-worklets', () => ({
  runOnUI: (fn) => fn,
  runOnJS: (fn) => fn,
}));

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');

  return {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (Component) => Component,
    },
    useSharedValue: (initialValue) => ({ value: initialValue }),
    useAnimatedStyle: (updater) => updater(),
    withTiming: (value) => value,
    withSpring: (value) => value,
    interpolate: (_value, _inputRange, outputRange) => outputRange[0],
    Extrapolation: { CLAMP: 'clamp' },
    Easing: {
      inOut: (fn) => fn,
      out: (fn) => fn,
      cubic: (value) => value,
    },
    runOnJS: (fn) => fn,
  };
});

jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');

  return {
    GestureHandlerRootView: View,
    GestureDetector: ({ children }) => children,
    Gesture: {
      Tap: () => ({
        maxDistance: () => ({
          onEnd: () => ({}),
        }),
      }),
      Pan: () => ({
        activeOffsetX: () => ({
          onUpdate: () => ({
            onEnd: () => ({}),
          }),
        }),
      }),
      Exclusive: (...gestures) => gestures[0],
    },
  };
});
