var Promise, chalk, exif, exifdate, fs, getFileStat, getFiles, getPhotoDate, isJpg, isPhoto, log, moment, path, processError, readChunk, sortPhotos, _;

Promise = require('bluebird');

fs = Promise.promisifyAll(require('fs-extra'));

path = require('path');

_ = require('lodash');

moment = require('moment');

chalk = require('chalk');

readChunk = require('read-chunk');

isJpg = require('is-jpg');

exif = Promise.promisifyAll(require('exifdata'));

exifdate = require('exifdate');

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
      return log('error', 'Directory or file not found, please try again');
    } else {
      return log('error', err);
    }
  } else {
    return log('error', err.message);
  }
};

getFiles = function(directory) {
  return fs.readdirAsync(directory);
};

getFileStat = function(file) {
  return fs.statAsync(file);
};

isPhoto = function(file) {
  return isJpg(readChunk.sync(file, 0, 3));
};

getPhotoDate = function(file) {
  return exif.extractAsync(file);
};

sortPhotos = function(sortable, inputDirectory, outputDirectory) {
  var directories;
  directories = _.keys(sortable);
  return Promise.each(directories, function(dir) {
    return Promise.each(sortable[dir], function(file) {
      var newPath, oldPath;
      oldPath = path.join(inputDirectory, file);
      newPath = path.join(outputDirectory, dir, file);
      return fs.moveAsync(oldPath, newPath);
    });
  });
};

module.exports = function(args, opts) {
  var directoryNameFormat, inputDirectory, outputDirectory, sortable, timer, unsortable;
  timer = process.hrtime();
  sortable = {};
  unsortable = [];
  inputDirectory = args[0] ? args[0] : process.cwd();
  outputDirectory = args[1] ? args[1] : process.cwd();
  directoryNameFormat = opts.format ? opts.format : 'YYYY_MM_DD';
  return getFiles(inputDirectory).filter(function(file) {
    return getFileStat(inputDirectory + '/' + file).then(function(fileStat) {
      if (fileStat.isFile()) {
        if (isPhoto(inputDirectory + '/' + file)) {
          return file;
        }
      }
    });
  }).map(function(file) {
    return Promise.props({
      filename: file,
      date: getPhotoDate(inputDirectory + '/' + file)
    });
  }).each(function(data) {
    var date, dirDate;
    date = exifdate(data.date.exif.DateTimeOriginal);
    if (date === null) {
      return unsortable.push(data.filename);
    } else {
      dirDate = moment(date).format(directoryNameFormat);
      if (_.has(sortable, dirDate)) {
        return sortable[dirDate].push(data.filename);
      } else {
        sortable[dirDate] = [];
        return sortable[dirDate].push(data.filename);
      }
    }
  }).then(function() {
    if (_.isEmpty(sortable)) {
      return log('warning', 'No sortable photos found!');
    } else {
      return sortPhotos(sortable, inputDirectory, outputDirectory);
    }
  }).then(function() {
    var diff, dirCount, photoCount, timeToRun;
    if (!_.isEmpty(sortable)) {
      dirCount = _.keys(sortable).length;
      photoCount = _.flatten(_.values(sortable)).length;
      diff = process.hrtime(timer);
      timeToRun = ((diff[0] * 1e9) + diff[1]) / 1e9;
      log('info', "\ntook " + (timeToRun.toPrecision(4)) + " seconds to sort " + photoCount + " files into " + dirCount + " directories");
    }
    if (unsortable.length) {
      return log('warning', "\ncould not sort the following files: " + (unsortable.join(',')));
    }
  })["catch"](function(err) {
    return processError(err);
  });
};
