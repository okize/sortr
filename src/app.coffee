# modules
Promise = require 'bluebird'
fs = Promise.promisifyAll require('fs')
path = require 'path'
_ = require 'lodash'
moment = require 'moment'
chalk = require 'chalk'
readChunk = require 'read-chunk'
isJpg = require 'is-jpg'
mkdirp = Promise.promisifyAll require 'mkdirp'
move = Promise.promisifyAll require 'mv'
exif = Promise.promisifyAll require 'exifdata'
exifdate = require 'exifdate'

# logs message types to console with color
log = (type, msg) ->
  colors =
    error: 'red'
    info: 'blue'
    warning: 'yellow'
  console.log chalk[ colors[type] ] msg

# attempt to make human-readble error messages
processError = (err) ->
  if err.cause?
    if err.cause.code == 'ENOENT'
      log 'error', 'Input directory not found, please try again'
  else
    log 'error', err.message

# returns a directory list promise
getFiles = (directory) ->
  fs.readdirAsync directory

# returns stat object for file
isFile = (file) ->
  fs.statAsync file

# tests whether file is a jpeg
# this is sync but would be better to be async
isPhoto = (file) ->
  isJpg readChunk.sync(file, 0, 3)

# returns date of photo file
getPhotoDate = (file) ->
  exif.extractAsync file

# creates directories from array of directory names
createDirectories = (directories, outputDirectory) ->
  Promise.each(directories, (dir) ->
    mkdirp(outputDirectory + '/' + dir)
  )

# moves files into
sortPhotos = (directories, workingDirectory, outputDirectory, sortable) ->
  Promise.each(directories, (dir) ->
    sortable[dir].forEach((file) ->
      console.log "move #{file} to #{dir}"
    )
  )

module.exports = (args, opts) ->

  # sort object: keys are datestamps, properties are arrays of files
  sortable = {}

  # array of files that could not be sorted
  unsortable = []

  # directory to red files from
  # if no directory arg passed then assume current working directory
  workingDirectory = if args[0] then args[0] else process.cwd()

  # directory to output sorted files & directories to
  # if no directory arg passed then assume current working directory
  outputDirectory = if args[1] then args[1] else process.cwd()

  # use option format or default if none
  directoryNameFormat = if opts.format then opts.format else 'YYYY_MM_DD'

  # option to only sort jpegs not other types of photos
  onlyPhotos = if opts.photos then opts.photos else true

  getFiles(

    # read directory of files
    workingDirectory

  ).filter( (file) ->

    # only attempt to read files, not directories or symlinks
    isFile(workingDirectory + '/' + file).then( (fileStat) ->
      if fileStat.isFile()
         # only sort photos
        if onlyPhotos
          file if isPhoto(workingDirectory + '/' + file)
        else
          file
    )

  ).map( (file) ->

    # create an array of objects with filenames & exif data
    Promise.props(
      filename: file
      date: getPhotoDate(workingDirectory + '/' + file)
    ).then (result) ->
      result

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

    # create the necessary destination directories
    createDirectories(_.keys(sortable), outputDirectory).then( (directories) ->

      # sort photos into their respective directories
      sortPhotos(directories, workingDirectory, outputDirectory, sortable)

    )

  ).then( () ->

    dirCount = _.keys(sortable).length
    photoCount = _.flatten(_.values(sortable)).length
    log 'info', "\nfinished sorting #{photoCount} files into #{dirCount} directories"
    log 'warning', "\ncould not sort the following files: #{unsortable.join(',')}"

  ).catch( (err) ->

    processError err

  )
