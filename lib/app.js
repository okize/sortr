var Logger, Promise, convertExifDate, exif, fs, getFileStat, getFiles, getPhotoDate, isJpg, isPhoto, moment, path, readChunk, sortPhotos, _;

Promise = require('bluebird');

fs = Promise.promisifyAll(require('fs-extra'));

path = require('path');

_ = require('lodash');

moment = require('moment');

readChunk = require('read-chunk');

isJpg = require('is-jpg');

exif = Promise.promisifyAll(require('exifdata'));

Logger = require(path.resolve(__dirname, './', 'logger'));

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

sortPhotos = function(sortable, inputDirectory, outputDirectory, dryRun, log) {
  var directories;
  directories = _.keys(sortable);
  return Promise.each(directories, function(dir) {
    return Promise.each(sortable[dir], function(file) {
      var newPath, oldPath;
      oldPath = path.join(inputDirectory, file);
      newPath = path.join(outputDirectory, dir, file);
      if (!dryRun) {
        return fs.moveAsync(oldPath, newPath);
      } else {
        return log.msg('dryRun', "will move " + file + " to " + outputDirectory + "/" + dir + "/");
      }
    });
  });
};

module.exports = function(args, opts) {
  var directoryNameFormat, inputDirectory, log, outputDirectory, sortable, timer, unsortable;
  log = new Logger(opts);
  timer = process.hrtime();
  sortable = {};
  unsortable = [];
  inputDirectory = args[0] ? args[0] : process.cwd();
  outputDirectory = args[1] ? args[1] : process.cwd();
  directoryNameFormat = opts.format ? opts.format : 'YYYY_MM_DD';
  log.msg('status', "- reading input directory files", timer);
  return getFiles(inputDirectory).filter(function(file, i) {
    if (i === 0) {
      log.msg('status', "- filtering non-photo files from sort set", timer);
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
      log.msg('status', "- reading photo exif dates", timer);
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
    log.msg('status', "- sorting photos into directories", timer);
    if (_.isEmpty(sortable)) {
      return log.msg('warning', 'No sortable photos found!');
    } else {
      return sortPhotos(sortable, inputDirectory, outputDirectory, opts.dryrun, log);
    }
  }).then(function() {
    var dirCount, photoCount;
    if (!_.isEmpty(sortable) && opts.stats && !opts.dryrun) {
      dirCount = _.keys(sortable).length;
      photoCount = _.flatten(_.values(sortable)).length;
      log.msg('info', "\nsorted " + photoCount + " files into " + dirCount + " directories");
    }
    if (unsortable.length) {
      return log.msg('warning', "\ncould not sort the following files: " + (unsortable.join(',')));
    }
  })["finally"](function() {
    return log.msg('status', "- sorting complete!", timer);
  })["catch"](function(error) {
    return log.error(error);
  });
};
