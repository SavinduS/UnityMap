const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Stub Node core modules that exifreader/dist/exif-reader.js tries to require (https/http/fs/crypto)
// In React Native / Expo Metro environment these modules don't exist and cause
// "Unable to resolve module https" error. Empty shim satisfies resolver without crashing bundler.
const emptyShim = path.resolve(__dirname, 'src/utils/emptyShim.js');
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  https: emptyShim,
  http: emptyShim,
  fs: emptyShim,
  crypto: emptyShim,
};

module.exports = config;
