(function() {
  'use strict';

  var sass = require('node-sass'),
      each = require('async').each,
      path = require('path'),

      isSassFile = function isSassFile(filename) {
        return (/^[^_.].*\.scss/).test(path.basename(filename));
      },

      isPartial = function isPartial(filename) {
        return (/^_.*\.scss/).test(path.basename(filename));
      },

      compile = function(basePath, files, filename, done) {
        var file = files[filename],
            includes = this.includePaths || [],
            outputStyle = this.outputStyle || 'compressed',
            imagePath = this.imagePath || '/',
            outputDir = this.outputDir || path.dirname(filename),
            fileDir = path.dirname(path.join(basePath, filename)),
            outFileName = path.basename(filename).replace('.scss', '.css'),
            sourceMap = this.sourceMap || false;

        if (isSassFile(filename) === true) {
          // Append the file's base path to the available include paths.
          includes.push(fileDir);

          // Compile the file using SASS.
          sass.render({
            // Use the file's content stream buffer rather than the file path.
            file: path.basename(filename),
            includePaths: includes,
            imagePath: imagePath,
            outputStyle: outputStyle,
            outFile: outFileName,
            sourceMap: sourceMap,
            success: function handleSuccess(result) {
              // replace contents
              file.contents = new Buffer(result.css);
              // rename file extension
              files[path.join(outputDir, path.basename(filename).replace('.scss', '.css'))] = file;
              delete files[filename];

              // create source map
              var map = JSON.parse(result.map);
              if(result.map && Object.keys(map).length !== 0) {
                var mapFile = { };
                mapFile.contents = new Buffer(result.map);
                files[path.join(outputDir, outFileName + '.map')] = mapFile;
              }

              done();
            },
            error: function handleError(err) {
              if (typeof err === 'string') {
                err = new Error(err);
              }
              done(err);
            }
          });
        } else if (isPartial(filename) === true) {
          delete files[filename];
          done();
        } else {
          done();
        }
      },

      compileSass = function compileSass(files, metalsmith, done) {
        /**
         * Looks up different key names on `metalsmith` to support
         * old versions (< v1) of Metalsmith. At some point, I will remove
         * support for < v1 and remove the key lookups
         */
        var directory = metalsmith.dir || metalsmith._directory,
            source = metalsmith._src || metalsmith._source,
            basePath = path.join(directory, source);
        each(Object.keys(files), compile.bind(this, basePath, files), done);
      },

      plugin = function plugin(options) {
        var config = options || {};
        return compileSass.bind(config);
      };

  module.exports = plugin;
}());
