# modules
Promise = require 'bluebird'
fs = Promise.promisifyAll require 'fs-extra'
path = require 'path'
_ = require 'lodash'
moment = require 'moment'
chalk = require 'chalk'
readChunk = require 'read-chunk'
isJpg = require 'is-jpg'
exif = Promise.promisifyAll require 'exifdata'

# logs message types to console with color
log = (type, msg) ->
  colors =
    status: 'white'
    dryRun: 'green'
    error: 'red'
    info: 'blue'
    warning: 'yellow'
  console.log chalk[colors[type]] msg

# attempt to make human-readble error messages
processError = (err) ->
  if err.cause?
    if err.cause.code == 'ENOENT'
      log 'error', 'Directory or file not found, please try again'
    else
      log 'error', err
  else
    log 'error', err.message

# returns a directory listing
getFiles = (directory) ->
  fs.readdirAsync directory

# returns stat object for file
getFileStat = (file) ->
  fs.statAsync file

# tests whether file is a jpeg
# this is sync but would be better to be async
isPhoto = (file) ->
  isJpg readChunk.sync(file, 0, 3)

# returns date of photo file
getPhotoDate = (file) ->
  exif.extractAsync file

convertExifDate = (exifDate) ->
  regex = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/
  parse = regex.exec(exifDate)
  return null if not parse or parse.length != 7
  year = parseInt(parse[1], 10)
  month = parseInt(parse[2], 10) - 1
  day = parseInt(parse[3], 10)
  hour = parseInt(parse[4], 10)
  minute = parseInt(parse[5], 10)
  second = parseInt(parse[6], 10)
  new Date(Date.UTC(year, month, day, hour, minute, second))

# moves files into
sortPhotos = (sortable, inputDirectory, outputDirectory, dryRun) ->
  directories = _.keys(sortable)
  Promise.each directories, (dir) ->
    Promise.each sortable[dir], (file) ->
      oldPath = path.join(inputDirectory, file)
      newPath = path.join(outputDirectory, dir, file)
      unless dryRun
        fs.moveAsync oldPath, newPath
      else
        log 'dryRun', "will move #{file} to #{outputDirectory}/#{dir}/"

# given a number, returns that number truncated to specified decimal place
floorFigure = (figure, decimals) ->
  decimals = 2  unless decimals
  d = Math.pow(10, decimals)
  (parseInt(figure * d) / d).toFixed decimals

# given a timer argument will return time elapsed since timer started
getProgressTime = (timer) ->
  diff = process.hrtime(timer)
  time = ((diff[0] * 1e9) + diff[1]) / 1e9
  floorFigure(time, 3)

module.exports = (args, opts) ->

  # start timer to track time to run script
  timer = process.hrtime()

  # sort object: keys are datestamps, values are arrays of files
  sortable = {}

  # array of files that could not be sorted
  unsortable = []

  # directory to red files from
  # if no directory arg passed then assume current working directory
  inputDirectory = if args[0] then args[0] else process.cwd()

  # directory to output sorted files & directories to
  # if no directory arg passed then assume current working directory
  outputDirectory = if args[1] then args[1] else process.cwd()

  # use option format or default if none
  directoryNameFormat = if opts.format then opts.format else 'YYYY_MM_DD'

  log 'status', "- reading input directory files (#{getProgressTime(timer)}s)" if opts.verbose

  getFiles(

    # read directory of files
    inputDirectory

  ).filter( (file, i) ->

    if i is 0
      log 'status', "- filtering non-photo files from sort set (#{getProgressTime(timer)}s)" if opts.verbose

    # only attempt to read files, not directories or symlinks
    getFileStat(path.join(inputDirectory, file)).then( (fileStat) ->

      # only sort photos
      if fileStat.isFile()
        file if isPhoto(path.join(inputDirectory, file))

    )

  ).map( (file, i) ->

    if i is 0
      log 'status', "- reading photo exif dates (#{getProgressTime(timer)}s)" if opts.verbose

    # create an array of objects with filenames & exif data
    Promise.props(
      filename: file
      date: getPhotoDate(path.join(inputDirectory, file))
    )

  ).each( (data) ->

    # get the date of each photo to be sorted and store in sortable object
    date = convertExifDate data.date.exif.DateTimeOriginal

    if date is null
      unsortable.push data.filename
    else
      dirDate = moment(date).format(directoryNameFormat)
      if _.has(sortable, dirDate)
        sortable[dirDate].push data.filename
      else
        sortable[dirDate] = []
        sortable[dirDate].push data.filename

  ).then( () ->

    log 'status', "- sorting photos into directories (#{getProgressTime(timer)}s)" if opts.verbose

    # sort photos into their respective directories
    if _.isEmpty sortable
      log 'warning', 'No sortable photos found!'
    else
      unless opts.dryrun
        sortPhotos(sortable, inputDirectory, outputDirectory, false)
      else
        sortPhotos(sortable, inputDirectory, outputDirectory, true)

  ).then( () ->

    log 'status', "- finished! (#{getProgressTime(timer)}s)" if opts.verbose

    # log summary messages to console
    if !_.isEmpty(sortable) and opts.stats and !opts.dryrun
      dirCount = _.keys(sortable).length
      photoCount = _.flatten(_.values(sortable)).length
      log 'info', "\ntook #{getProgressTime(timer)} seconds to sort #{photoCount} files into #{dirCount} directories"

    if unsortable.length
      log 'warning', "\ncould not sort the following files: #{unsortable.join(',')}"

  ).catch( (err) ->

    processError err

  )
