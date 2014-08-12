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
exifdate = require 'exifdate'

# logs message types to console with color
log = (type, msg) ->
  colors =
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

# moves files into
sortPhotos = (sortable, inputDirectory, outputDirectory) ->
  directories = _.keys(sortable)
  Promise.each directories, (dir) ->
    Promise.each sortable[dir], (file) ->
      oldPath = path.join(inputDirectory, file)
      newPath = path.join(outputDirectory, dir, file)
      fs.moveAsync oldPath, newPath

module.exports = (args, opts) ->

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

  getFiles(

    # read directory of files
    inputDirectory

  ).filter( (file) ->

    # only attempt to read files, not directories or symlinks
    getFileStat(inputDirectory + '/' + file).then( (fileStat) ->

      # only sort photos
      if fileStat.isFile()
        file if isPhoto(inputDirectory + '/' + file)

    )

  ).map( (file) ->

    # create an array of objects with filenames & exif data
    Promise.props(
      filename: file
      date: getPhotoDate(inputDirectory + '/' + file)
    )

  ).each( (data) ->

    # get the date of each photo to be sorted and store in sortable object
    date = exifdate data.date.exif.DateTimeOriginal

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

    # sort photos into their respective directories
    if _.isEmpty sortable
      log 'warning', 'No sortable photos found!'
    else
      sortPhotos(sortable, inputDirectory, outputDirectory)

  ).then( () ->

    # log summary messages to console
    if !_.isEmpty sortable
      dirCount = _.keys(sortable).length
      photoCount = _.flatten(_.values(sortable)).length
      log 'info', "\nfinished sorting #{photoCount} files into #{dirCount} directories"

    if unsortable.length
      log 'warning', "\ncould not sort the following files: #{unsortable.join(',')}"

  ).catch( (err) ->

    processError err

  )
