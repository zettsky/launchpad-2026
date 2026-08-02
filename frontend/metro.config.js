const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// react-leaflet v5 (and some other web-only deps) ship as pure ESM using the
// package.json "exports" field with no legacy "main" fallback that Metro can resolve
// without this on.
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
