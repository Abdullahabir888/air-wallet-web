// Expo SDK 52+ detects npm workspaces automatically; this file only adds the
// firebase package-exports fix so Metro picks the React Native build of the Firebase SDK.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('cjs');
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
