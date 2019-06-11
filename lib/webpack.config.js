// https://webpack.js.org/configuration

module.exports = {

  /* node: {
    global: false,
  }, */

  devtool: false, // Switch off 'eval' !!

  mode: 'development',

  entry: './index',

  output: {

    library: 'KeyboardDrop', // Was: 'KeyboardSorted', 'A11ySorted',

    libraryTarget: 'global' // Or: 'umd', 'window' etc.

  }
};
