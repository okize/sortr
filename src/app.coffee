# modules
Promise = require 'bluebird'
fs = Promise.promisifyAll require('fs')
path = require 'path'
_ = require 'lodash'
moment = require 'moment'
mkdirp = require 'mkdirp'
chalk = require 'chalk'
readChunk = require 'read-chunk'
isJpg = require 'is-jpg'
ExifImage = Promise.promisifyAll require('exif').ExifImage

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
getPhotoDate = (file, callback) ->
  new ExifImage({ image: file }, (err, exifData) ->
    callback err, null if err
    callback null, exifData.exif.DateTimeOriginal
  )

module.exports = (args, opts) ->

  # sort object: keys are datestamps, properties are arrays of files
  sort = {}

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

  ).filter( (filename) ->

    # only attempt to read files, not directories or symlinks
    isFile(workingDirectory + '/' + filename).then( (fileStat) ->

      if fileStat.isFile()
         # only sort photos
        if onlyPhotos
          filename if isPhoto(workingDirectory + '/' + filename)
        else
          filename
    )

  ).then( (files) ->

    files.forEach (file) ->
      getPhotoDate(workingDirectory + '/' + file).then( (data) ->
        data
      )

  ).then( (files) ->

    console.log files

  ).catch( (err) ->

    processError err

  )
