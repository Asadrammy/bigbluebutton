const { getDefaultConfig } = require('expo/metro-config');

/**
 * Metro configuration
 * https://docs.expo.dev/guides/customizing-metro
 * Learn more: https://docs.expo.dev/guides/customizing-metro
 *
 * @type {import('expo/metro-config').MetroConfig}
 */
const config = getDefaultConfig(__dirname);

// Exclude native modules from bundling for Expo Go compatibility
// These modules are only available in custom dev client builds
config.resolver.blockList = [
  /node_modules\/onnxruntime-react-native\/.*/,
  /node_modules\/react-native-pytorch-core\/.*/,
];

module.exports = config;

