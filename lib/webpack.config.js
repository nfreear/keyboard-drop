// https://webpack.js.org/configuration

/* global __dirname: false */

// const path = require('path');

module.exports = {

  /* node: {
    global: false,
  }, */

  devtool: false, // Switch off 'eval' !!

  mode: 'development',

  entry: './index',

  output: {
    // options related to how webpack emits results
    // path: path.resolve(__dirname, '/..', 'dist'), // string (Error: EACCES: permission denied)
    // the target directory for all output files
    // must be an absolute path (use the Node.js path module)
    filename: 'keyboard-drop.js', // string
    // the filename template for entry chunks

    library: 'KeyboardDrop', // Was: 'KeyboardSorted', 'A11ySorted',

    libraryTarget: 'global' // Or: 'umd', 'window' etc.

  }
};
