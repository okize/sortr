var ExifImage, Promise, chalk, fileType, fs, getFileType, getFiles, getPhotoDate, isFile, log, mkdirp, moment, path, processError, readChunk, _;

Promise = require('bluebird');

fs = Promise.promisifyAll(require('fs'));

path = require('path');

readChunk = require('read-chunk');

fileType = require('file-type');

_ = require('lodash');

moment = require('moment');

chalk = require('chalk');

mkdirp = require('mkdirp');

ExifImage = Promise.promisifyAll(require('exif').ExifImage);

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
  if (err.cause.code === 'ENOENT') {
    return log('error', 'Input directory not found, please try again');
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

getFileType = function(file) {
  return fileType(readChunk.sync(file, 0, 262));
};

getPhotoDate = function(file, callback) {
  return new ExifImage({
    image: file
  }, function(err, exifData) {
    if (err) {
      callback(err);
    }
    return exifData.exif;
  });
};

module.exports = function(args, opts) {
  var allowedFormats, countOfFiles, countOfSortedFiles, directoryNameFormat, filesToIgnore, workingDirectory;
  workingDirectory = args[0] ? args[0] : process.cwd();
  directoryNameFormat = opts.format ? opts.format : 'YYYY_MM_DD';
  allowedFormats = ['jpg', 'png', 'gif'];
  filesToIgnore = ['.DS_Store'];
  countOfFiles = 0;
  countOfSortedFiles = 0;
  return getFiles(workingDirectory).filter(function(filename) {
    var file;
    file = workingDirectory + '/' + filename;
    return isFile(file).then(function(fileStat) {
      if (fileStat.isFile()) {
        return file;
      }
    });
  }).then(function(files) {
    return console.log(files);
  })["catch"](function(err) {
    return processError(err);
  });
};
