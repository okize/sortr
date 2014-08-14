var Promise, chalk, convertExifDate, exif, fs, getFileStat, getFiles, getPhotoDate, isJpg, isPhoto, log, moment, path, processError, readChunk, sortPhotos, _;

Promise = require('bluebird');

fs = Promise.promisifyAll(require('fs-extra'));

path = require('path');

_ = require('lodash');

moment = require('moment');

chalk = require('chalk');

readChunk = require('read-chunk');

isJpg = require('is-jpg');

exif = Promise.promisifyAll(require('exifdata'));

log = function(type, msg) {
  var colors;
  colors = {
    status: 'white',
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

convertExifDate = function(exifDate) {
  var day, hour, minute, month, parse, regex, second, year;
  regex = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;
  parse = regex.exec(exifDate);
  if (!parse || parse.length !== 7) {
    return null;
  }
  year = parseInt(parse[1], 10);
  month = parseInt(parse[2], 10) - 1;
  day = parseInt(parse[3], 10);
  hour = parseInt(parse[4], 10);
  minute = parseInt(parse[5], 10);
  second = parseInt(parse[6], 10);
  return new Date(Date.UTC(year, month, day, hour, minute, second));
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
  if (opts.verbose) {
    log('status', '- reading input directory files');
  }
  return getFiles(inputDirectory).filter(function(file, i) {
    if (i === 0) {
      if (opts.verbose) {
        log('status', '- filtering non-photo files from sort set');
      }
    }
    return getFileStat(path.join(inputDirectory, file)).then(function(fileStat) {
      if (fileStat.isFile()) {
        if (isPhoto(path.join(inputDirectory, file))) {
          return file;
        }
      }
    });
  }).map(function(file, i) {
    if (i === 0) {
      if (opts.verbose) {
        log('status', '- reading photo exif dates');
      }
    }
    return Promise.props({
      filename: file,
      date: getPhotoDate(path.join(inputDirectory, file))
    });
  }).each(function(data) {
    var date, dirDate;
    date = convertExifDate(data.date.exif.DateTimeOriginal);
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
    if (opts.verbose) {
      log('status', '- sorting photos into directories');
    }
    if (_.isEmpty(sortable)) {
      return log('warning', 'No sortable photos found!');
    } else {
      return sortPhotos(sortable, inputDirectory, outputDirectory);
    }
  }).then(function() {
    var diff, dirCount, photoCount, timeToRun;
    if (opts.verbose) {
      log('status', '- finished!');
    }
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
