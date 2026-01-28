/**
 * Webpack Config
 *
 * Extends @wordpress/scripts default config to use TypeScript entry point
 */

const defaultConfig = require('@wordpress/scripts/config/webpack.config');
const path = require('path');

module.exports = {
    ...defaultConfig,
    entry: {
        index: path.resolve(__dirname, 'src/index.tsx'),
    },
};
