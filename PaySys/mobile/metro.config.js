const { getDefaultConfig } = require('@react-native/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = {
  ...config,
  resolver: {
    ...(config.resolver || {}),
    blockList: [/node_modules\/expo-modules-autolinking\/.*\/build\/.*$/],
  },
};
