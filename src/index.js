const browserify = require('@cypress/browserify-preprocessor')
const itify = require('./itify')

// can we make "pickTests" async?
const onFilePreprocessor = (config, pickTests) => {
  const options = {
	  typescript: require.resolve('typescript'),
    browserifyOptions: {
	    extensions: ['.js', '.ts'],
      transform: [
          ...browserify.defaultOptions.browserifyOptions.transform,
	      itify(config, pickTests),
      ]
    }
  }

  return browserify(options)
}

module.exports = onFilePreprocessor
