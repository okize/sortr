var Promise, chalk, exif, fs, getFiles, getPhotoDate, isFile, isJpg, isPhoto, log, mkdirp, moment, path, processError, readChunk, _;

Promise = require('bluebird');

fs = Promise.promisifyAll(require('fs'));

path = require('path');

_ = require('lodash');

moment = require('moment');

mkdirp = require('mkdirp');

chalk = require('chalk');

readChunk = require('read-chunk');

isJpg = require('is-jpg');

exif = Promise.promisifyAll(require('exifdata'));

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

getPhotoDate = function(file) {
  return exif.extractAsync(file);
};

module.exports = function(args, opts) {
  var directoryNameFormat, onlyPhotos, outputDirectory, sort, unsortable, workingDirectory;
  sort = [];
  unsortable = [];
  workingDirectory = args[0] ? args[0] : process.cwd();
  outputDirectory = args[1] ? args[1] : process.cwd();
  directoryNameFormat = opts.format ? opts.format : 'YYYY_MM_DD';
  onlyPhotos = opts.photos ? opts.photos : true;
  return getFiles(workingDirectory).filter(function(file) {
    return isFile(workingDirectory + '/' + file).then(function(fileStat) {
      if (fileStat.isFile()) {
        if (onlyPhotos) {
          if (isPhoto(workingDirectory + '/' + file)) {
            return file;
          }
        } else {
          return file;
        }
      }
    });
  }).map(function(file) {
    return Promise.props({
      filename: file,
      date: getPhotoDate(workingDirectory + '/' + file)
    }).then(function(result) {
      return result;
    });
  }).then(function(data) {
    return console.log(data);
  })["catch"](function(err) {
    return processError(err);
  });
};
