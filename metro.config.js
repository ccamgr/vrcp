const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot, {
  isCSSEnabled: true,
});

// for react-native-svg-transformer
if (config.resolver.assetExts.includes("svg")) {
  config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== "svg");
}
if (!config.resolver.sourceExts.includes('svg')) {
  config.resolver.sourceExts.push('svg');
}
if (!config.transformer.babelTransformerPath) {
  config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');
}

// for wasm support for web-sqlite 
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}
if (!config.resolver.sourceExts.includes('wasm')) {
  config.resolver.sourceExts.push('wasm');
}
module.exports = config;