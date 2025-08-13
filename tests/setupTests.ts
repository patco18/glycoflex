import '@testing-library/jest-native/extend-expect';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import 'react-native-gesture-handler/jestSetup';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock reanimated
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('expo-random', () => ({
  getRandomBytes: (length: number) => require('node:crypto').randomBytes(length)
}));


if (!global.crypto) {
  // Provide Web Crypto implementation
  // @ts-ignore
  global.crypto = require('node:crypto').webcrypto;
}
