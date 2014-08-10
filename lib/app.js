var Promise, chalk, createDirectories, exif, exifdate, fs, getFiles, getPhotoDate, isFile, isJpg, isPhoto, log, mkdirp, moment, move, path, processError, readChunk, sortPhotos, _;

Promise = require('bluebird');

fs = Promise.promisifyAll(require('fs'));

path = require('path');

_ = require('lodash');

moment = require('moment');

chalk = require('chalk');

readChunk = require('read-chunk');

isJpg = require('is-jpg');

mkdirp = Promise.promisifyAll(require('mkdirp'));

move = Promise.promisifyAll(require('mv'));

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

createDirectories = function(directories, outputDirectory) {
  return Promise.each(directories, function(dir) {
    return mkdirp(outputDirectory + '/' + dir);
  });
};

sortPhotos = function(directories, workingDirectory, outputDirectory, sortable) {
  return Promise.each(directories, function(dir) {
    return sortable[dir].forEach(function(file) {
      return console.log("move " + file + " to " + dir);
    });
  });
};

module.exports = function(args, opts) {
  var directoryNameFormat, onlyPhotos, outputDirectory, sortable, unsortable, workingDirectory;
  sortable = {};
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
    return createDirectories(_.keys(sortable), outputDirectory).then(function(directories) {
      return sortPhotos(directories, workingDirectory, outputDirectory, sortable);
    });
  }).then(function() {
    var dirCount, photoCount;
    dirCount = _.keys(sortable).length;
    photoCount = _.flatten(_.values(sortable)).length;
    log('info', "\nfinished sorting " + photoCount + " files into " + dirCount + " directories");
    return log('warning', "\ncould not sort the following files: " + (unsortable.join(',')));
  })["catch"](function(err) {
    return processError(err);
  });
};
