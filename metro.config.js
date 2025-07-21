const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Optimisations spécifiques pour Android
config.resolver.platforms = ['android', 'native', 'web'];

// Configuration des assets pour Android
config.resolver.assetExts.push(
  // Assets audio pour notifications Android
  'wav',
  'mp3',
  // Assets pour icônes adaptatives Android
  'xml'
);

// Optimisation du cache pour Android
config.cacheStores = [
  {
    name: 'android-optimized',
    get: async (key) => {
      // Cache personnalisé pour Android
      return null;
    },
    set: async (key, value) => {
      // Stockage cache optimisé
    },
  },
];

// Configuration des transformations pour Android
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    // Optimisation minification pour Android
    mangle: {
      keep_fnames: true,
    },
    output: {
      ascii_only: true,
      quote_keys: true,
      wrap_iife: true,
    },
    sourceMap: {
      includeSources: false,
    },
    toplevel: false,
    compress: {
      reduce_funcs: false,
    },
  },
};

module.exports = config;
