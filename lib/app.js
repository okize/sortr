var Promise, chalk, fs, getFiles, isFile, isJpg, isPhoto, log, mkdirp, moment, path, processError, readChunk, _;

Promise = require('bluebird');

fs = Promise.promisifyAll(require('fs'));

path = require('path');

readChunk = require('read-chunk');

isJpg = require('is-jpg');

_ = require('lodash');

moment = require('moment');

chalk = require('chalk');

mkdirp = require('mkdirp');

log = function(type, msg) {
  var colors;
  colors = {
    error: 'red',
    info: 'blue',
    warning: 'yellow'
  };
  return console.log(chalk[colors[type]](msg));
};

processError = function(err) {
  if (err.cause != null) {
    if (err.cause.code === 'ENOENT') {
      return log('error', 'Input directory not found, please try again');
    }
  } else {
    return log('error', err.message);
  }
};

getFiles = function(directory) {
  return fs.readdirAsync(directory);
};

isFile = function(file) {
  return fs.statAsync(file);
};

isPhoto = function(file) {
  return isJpg(readChunk.sync(file, 0, 3));
};

module.exports = function(args, opts) {
  var directoryNameFormat, onlyPhotos, workingDirectory;
  workingDirectory = args[0] ? args[0] : process.cwd();
  directoryNameFormat = opts.format ? opts.format : 'YYYY_MM_DD';
  onlyPhotos = opts.photos ? opts.photos : true;
  return getFiles(workingDirectory).filter(function(filename) {
    return isFile(workingDirectory + '/' + filename).then(function(fileStat) {
      if (fileStat.isFile()) {
        if (onlyPhotos) {
          if (isPhoto(workingDirectory + '/' + filename)) {
            return filename;
          }
        } else {
          return filename;
        }
      }
    });
  }).then(function(files) {
    return console.log(files);
  })["catch"](function(err) {
    return processError(err);
  });
};
