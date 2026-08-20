jest.mock('firebase/app', () => ({
  getApps: jest.fn(() => []),
  getApp: jest.fn(),
  initializeApp: jest.fn(() => ({ name: '[DEFAULT]' })),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  doc: jest.fn(() => ({})),
  collection: jest.fn(() => ({})),
  query: jest.fn(() => ({})),
  orderBy: jest.fn(() => ({})),
  getDoc: jest.fn(() => Promise.reject(new Error('Firestore is mocked in tests'))),
  getDocs: jest.fn(() => Promise.reject(new Error('Firestore is mocked in tests'))),
}));

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
      in: (fn) => fn,
      out: (fn) => fn,
      cubic: (value) => value,
      quad: (value) => value,
      bezier: () => (value) => value,
    },
    runOnJS: (fn) => fn,
  };
});

jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');

  const chainable = () => {
    const api = {};
    const methods = [
      'maxDistance',
      'activeOffsetX',
      'activeOffsetY',
      'onBegin',
      'onStart',
      'onUpdate',
      'onEnd',
      'onFinalize',
    ];
    for (const method of methods) {
      api[method] = () => api;
    }
    return api;
  };

  return {
    GestureHandlerRootView: View,
    GestureDetector: ({ children }) => children,
    Gesture: {
      Tap: () => chainable(),
      Pan: () => chainable(),
      Exclusive: (...gestures) => gestures[0],
    },
  };
});

jest.mock('@react-native-async-storage/async-storage', () => ({
  createAsyncStorage: jest.fn(() => ({
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
  })),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({ currentUser: null })),
  initializeAuth: jest.fn(() => ({ currentUser: null })),
  getReactNativePersistence: jest.fn(() => ({})),
  onAuthStateChanged: jest.fn((_auth, listener) => {
    listener(null);
    return jest.fn();
  }),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));
