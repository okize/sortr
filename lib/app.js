var ExifImage, Magic, Promise, chalk, checkFileType, fs, getFiles, getPhotoDate, isPhoto, log, magic, mkdirp, mmm, moment, path, processError, _;

Promise = require('bluebird');

fs = Promise.promisifyAll(require('fs'));

path = require('path');

_ = require('lodash');

moment = require('moment');

chalk = require('chalk');

mkdirp = require('mkdirp');

ExifImage = Promise.promisifyAll(require('exif').ExifImage);

mmm = require('mmmagic');

Magic = mmm.Magic;

magic = Promise.promisifyAll(new Magic(mmm.MAGIC_MIME_TYPE));

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

isPhoto = function(file) {
  return magic.detectFile(file, function(err, result) {
    if (err) {
      throw err;
    }
    if (result === 'image/jpeg') {
      return console.log(true);
    } else {
      return console.log(false);
    }
  });
};

getFiles = function(directory) {
  return fs.readdirAsync(directory);
};

checkFileType = function(file, typeToCheck) {
  return file;
};

getPhotoDate = function(file) {
  return new ExifImage({
    image: file
  }, function(error, exifData) {
    return exifData;
  });
};

module.exports = function(args, opts) {
  var countOfFiles, directoryNameFormat, filesToIgnore, workingDirectory;
  workingDirectory = args[0] ? args[0] : process.cwd();
  directoryNameFormat = opts.format ? opts.format : 'YYYY_MM_DD';
  filesToIgnore = ['.DS_Store'];
  countOfFiles = 0;
  return getFiles(workingDirectory).filter(function(filename) {
    return filename;
  }).then(function(files) {
    return console.log(files);
  })["catch"](function(err) {
    return processError(err);
  });
};
