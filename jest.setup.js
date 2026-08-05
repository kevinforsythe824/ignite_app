jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    Ionicons: ({ name }) => React.createElement(Text, null, name),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');

  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
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
    withTiming: (value, _config, callback) => {
      if (typeof callback === 'function') {
        callback(true);
      }
      return value;
    },
    withSpring: (value, _config, callback) => {
      if (typeof callback === 'function') {
        callback(true);
      }
      return value;
    },
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

  const createChain = () => {
    const chain = {};
    const methods = [
      'maxDistance',
      'activeOffsetX',
      'activeOffsetY',
      'onStart',
      'onUpdate',
      'onEnd',
      'onFinalize',
      'enabled',
    ];

    for (const method of methods) {
      chain[method] = () => chain;
    }

    return chain;
  };

  return {
    GestureHandlerRootView: View,
    GestureDetector: ({ children }) => children,
    Gesture: {
      Tap: () => createChain(),
      Pan: () => createChain(),
      Exclusive: (...gestures) => gestures[0],
    },
  };
});
