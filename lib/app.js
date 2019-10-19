const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs-extra'));
const path = require('path');
const _ = require('lodash');
const moment = require('moment');
const readChunk = require('read-chunk');
const isJpg = require('is-jpg');
const exifdata = require('exifdata');
const Logger = require('./logger');

const exif = Promise.promisifyAll(exifdata);

// returns a directory listing
const getFiles = (directory) => fs.readdirAsync(directory);

// returns stat object for file
const getFileStat = (file) => fs.statAsync(file);

// tests whether file is a jpeg
// this is sync but would be better to be async
const isPhoto = (file) => isJpg(readChunk.sync(file, 0, 3));

// returns date of photo file
const getPhotoDate = (file) => exif.extractAsync(file);

const convertExifDate = (exifDate) => {
  const regex = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;
  const parse = regex.exec(exifDate);
  if (!parse || (parse.length !== 7)) { return null; }
  const year = parseInt(parse[1], 10);
  const month = parseInt(parse[2], 10) - 1;
  const day = parseInt(parse[3], 10);
  const hour = parseInt(parse[4], 10);
  const minute = parseInt(parse[5], 10);
  const second = parseInt(parse[6], 10);
  return new Date(Date.UTC(year, month, day, hour, minute, second));
};

// moves files into
const sortPhotos = (sortable, inputDirectory, outputDirectory, dryRun, log) => {
  const directories = _.keys(sortable);
  return Promise.each(directories, (dir) => {
    Promise.each(sortable[dir], (file) => {
      const oldPath = path.join(inputDirectory, file);
      const newPath = path.join(outputDirectory, dir, file);
      if (!dryRun) {
        fs.moveAsync(oldPath, newPath);
      }
      return log.msg('move', `\t${file} -> ${outputDirectory}/${dir}/`);
    });
  });
};

module.exports = (args, opts) => {
  // init logger
  const log = new Logger(opts);

  // start timer to track time to run script
  const timer = process.hrtime();

  // sort object: keys are datestamps, values are arrays of files
  const sortable = {};

  // array of files that could not be sorted
  const unsortable = [];

  // directory to red files from
  // if no directory arg passed then assume current working directory
  const inputDirectory = args[0] ? args[0] : process.cwd();

  // directory to output sorted files & directories to
  // if no directory arg passed then assume current working directory
  const outputDirectory = args[1] ? args[1] : process.cwd();

  // use option format or default if none
  const directoryNameFormat = opts.format ? opts.format : 'YYYY_MM_DD';

  if (opts.dryrun) {
    log.msg('warning', '\nDRY RUN, NO FILES WILL BE SORTED!\n');
  }

  log.msg('status', '- reading input directory files', timer);

  // read directory of files
  return getFiles(inputDirectory)
    .filter((file, i) => {
      if (i === 0) {
        log.msg('status', '- filtering non-photo files from set', timer);
      }

      // only attempt to read files, not directories or symlinks
      return getFileStat(path.join(inputDirectory, file)).then((fileStat) => {
        // only sort photos
        if (fileStat.isFile()) {
          if (isPhoto(path.join(inputDirectory, file))) {
            return file;
          }
          return null;
        }
        return null;
      });
    })
    .map((file, i) => {
      if (i === 0) { log.msg('status', '- reading photo exif dates', timer); }

      // create an array of objects with filenames & exif data
      return Promise.props({
        filename: file,
        date: getPhotoDate(path.join(inputDirectory, file)),
      });
    })
    .each((data) => {
      // get the date of each photo to be sorted and store in sortable object
      const date = convertExifDate(data.date.exif.DateTimeOriginal);

      if (date === null) {
        return unsortable.push(data.filename);
      }
      const dirDate = moment(date).format(directoryNameFormat);
      if (_.has(sortable, dirDate)) {
        return sortable[dirDate].push(data.filename);
      }
      sortable[dirDate] = [];
      return sortable[dirDate].push(data.filename);
    })
    .then(() => {
      log.msg('status', '- sorting photos into directories', timer);

      // sort photos into their respective directories
      if (_.isEmpty(sortable)) {
        return log.msg('warning', 'No sortable photos found!');
      }
      return sortPhotos(sortable, inputDirectory, outputDirectory, opts.dryrun, log);
    })
    .finally(() => {
      log.msg('status', '- sorting complete!', timer);

      // log.msg summary messages to console
      if (!_.isEmpty(sortable) && opts.stats && !opts.dryrun) {
        const dirCount = _.keys(sortable).length;
        const photoCount = _.flatten(_.values(sortable)).length;
        return log.msg('info', `sorted ${photoCount} files into ${dirCount} directories`);
      }

      if (unsortable.length) {
        const unsortables = unsortable.join(', ');
        return log.msg('warning', `could not sort the following files: ${unsortables}`);
      }
      return null;
    })
    .catch((error) => log.error(error));
};
