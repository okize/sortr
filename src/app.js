let Promise = require('bluebird');
let fs = Promise.promisifyAll(require('fs-extra'));
let path = require('path');
let _ = require('lodash');
let moment = require('moment');
let readChunk = require('read-chunk');
let isJpg = require('is-jpg');
let exif = Promise.promisifyAll(require('exifdata'));
let Logger = require(path.resolve(__dirname, './', 'logger'));

// returns a directory listing
let getFiles = directory => fs.readdirAsync(directory);

// returns stat object for file
let getFileStat = file => fs.statAsync(file);

// tests whether file is a jpeg
// this is sync but would be better to be async
let isPhoto = file => isJpg(readChunk.sync(file, 0, 3));

// returns date of photo file
let getPhotoDate = file => exif.extractAsync(file);

let convertExifDate = function(exifDate) {
  let regex = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;
  let parse = regex.exec(exifDate);
  if (!parse || (parse.length !== 7)) { return null; }
  let year = parseInt(parse[1], 10);
  let month = parseInt(parse[2], 10) - 1;
  let day = parseInt(parse[3], 10);
  let hour = parseInt(parse[4], 10);
  let minute = parseInt(parse[5], 10);
  let second = parseInt(parse[6], 10);
  return new Date(Date.UTC(year, month, day, hour, minute, second));
};

// moves files into
let sortPhotos = function(sortable, inputDirectory, outputDirectory, dryRun, log) {
  let directories = _.keys(sortable);
  return Promise.each(directories, dir =>
    Promise.each(sortable[dir], function(file) {
      let oldPath = path.join(inputDirectory, file);
      let newPath = path.join(outputDirectory, dir, file);
      if (!dryRun) {
        fs.moveAsync(oldPath, newPath);
      }
      return log.msg('move', `\t${file} -> ${outputDirectory}/${dir}/`);
    })
  );
};

module.exports = function(args, opts) {

  // init logger
  let log = new Logger(opts);

  // start timer to track time to run script
  let timer = process.hrtime();

  // sort object: keys are datestamps, values are arrays of files
  let sortable = {};

  // array of files that could not be sorted
  let unsortable = [];

  // directory to red files from
  // if no directory arg passed then assume current working directory
  let inputDirectory = args[0] ? args[0] : process.cwd();

  // directory to output sorted files & directories to
  // if no directory arg passed then assume current working directory
  let outputDirectory = args[1] ? args[1] : process.cwd();

  // use option format or default if none
  let directoryNameFormat = opts.format ? opts.format : 'YYYY_MM_DD';

  if (opts.dryrun) { log.msg('warning', "\nDRY RUN, NO FILES WILL BE SORTED!\n"); }

  log.msg('status', "- reading input directory files", timer);

  return getFiles(

    // read directory of files
    inputDirectory

  ).filter( function(file, i) {

    if (i === 0) { log.msg('status', "- filtering non-photo files from set", timer); }

    // only attempt to read files, not directories or symlinks
    return getFileStat(path.join(inputDirectory, file)).then( function(fileStat) {

      // only sort photos
      if (fileStat.isFile()) {
        if (isPhoto(path.join(inputDirectory, file))) { return file; }
      }

    });

  }).map( function(file, i) {

    if (i === 0) { log.msg('status', "- reading photo exif dates", timer); }

    // create an array of objects with filenames & exif data
    return Promise.props({
      filename: file,
      date: getPhotoDate(path.join(inputDirectory, file))
    });

  }).each( function(data) {

    // get the date of each photo to be sorted and store in sortable object
    let date = convertExifDate(data.date.exif.DateTimeOriginal);

    if (date === null) {
      return unsortable.push(data.filename);
    } else {
      let dirDate = moment(date).format(directoryNameFormat);
      if (_.has(sortable, dirDate)) {
        return sortable[dirDate].push(data.filename);
      } else {
        sortable[dirDate] = [];
        return sortable[dirDate].push(data.filename);
      }
    }

  }).then( function() {

    log.msg('status', "- sorting photos into directories", timer);

    // sort photos into their respective directories
    if (_.isEmpty(sortable)) {
      return log.msg('warning', 'No sortable photos found!');
    } else {
      return sortPhotos(sortable, inputDirectory, outputDirectory, opts.dryrun, log);
    }

  }).finally( function() {

    log.msg('status', "- sorting complete!", timer);

    // log.msg summary messages to console
    if (!_.isEmpty(sortable) && opts.stats && !opts.dryrun) {
      let dirCount = _.keys(sortable).length;
      let photoCount = _.flatten(_.values(sortable)).length;
      log.msg('info', `sorted ${photoCount} files into ${dirCount} directories`);
    }

    if (unsortable.length) {
      let unsortables = unsortable.join(', ');
      return log.msg('warning', `could not sort the following files: ${unsortables}`);
    }

  }).catch( error => log.error(error));
};
