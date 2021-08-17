/**
 * Dependencies
 */

const nodeResolve = require('@rollup/plugin-node-resolve'); // Locate modules using the Node resolution algorithm, for using third party modules in node_modules.
const replace = require('@rollup/plugin-replace');          // Replace content while bundling.
// const { babel } = require('@rollup/plugin-babel');

/**
 * Base module configuration. Refer to the package for details on the available options.
 *
 * @source https://rollupjs.org
 *
 * @type {Object}
 */
const rollup = {
  sourcemap: 'inline',
  format: 'iife',
  strict: true
};

/**
 * Plugin configuration. Refer to the package for details on the available options.
 *
 * @source https://github.com/rollup/plugins
 *
 * @type {Object}
 */
let plugins = [
  replace({
    preventAssignment: true,
    values: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
    }
  }),
  nodeResolve.nodeResolve({
    moduleDirectories: [
      'node_modules'
    ]
  })// ,
  // babel({
  //   babelHelpers: 'bundled'
  // })
];

/**
 * ES Module Exports
 *
 * @type {Array}
 */
module.exports = [
  {
    input: `${process.env.PWD}/src/js/default.js`,
    output: [
      {
        name: 'Default',
        file: `${process.env.PWD}/dist/js/default.js`,
        sourcemap: rollup.sourcemap,
        format: rollup.format,
        strict: rollup.strict,
        exports: 'none',
        interop: true
      }
    ],
    plugins: plugins,
    devModule: true
  }
];
