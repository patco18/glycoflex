module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(nanoid|react-native|@react-native|@react-navigation|expo[-]?|@expo(nent)?/.*|@expo-google-fonts/.*|expo-font|expo-secure-store|expo-random|expo-constants|expo-linear-gradient|expo-modules-core|@react-native-async-storage/async-storage|@react-native-community|react-native-svg)/)'
  ]
};
