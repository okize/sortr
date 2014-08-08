# modules
Promise = require 'bluebird'
fs = Promise.promisifyAll require('fs')
path = require 'path'
readChunk = require 'read-chunk'
fileType = require 'file-type'
_ = require 'lodash'
moment = require 'moment'
chalk = require 'chalk'
mkdirp = require 'mkdirp'

ExifImage = Promise.promisifyAll require('exif').ExifImage

log = (type, msg) ->
  colors =
    error: 'red'
    info: 'blue'
    warning: 'yellow'
  console.log chalk[ colors[type] ] msg

processError = (err) ->
  if err.cause.code == 'ENOENT'
    log 'error', 'Input directory not found, please try again'
  else
    log 'error', err.message

getFiles = (directory) ->
  fs.readdirAsync directory

isFile = (file) ->
  fs.statAsync file

getFileType = (file) ->
  fileType readChunk.sync(file, 0, 262)

getPhotoDate = (file, callback) ->
  new ExifImage({ image: file }, (err, exifData) ->
    callback err if err
    exifData.exif
  )

module.exports = (args, opts) ->

  # directory to look for photos in
  # if a directory is not passed as an argument then
  # assume current working directory
  workingDirectory = if args[0] then args[0] else process.cwd()

  # use option format or default if none
  directoryNameFormat = if opts.format then opts.format else 'YYYY_MM_DD'

  # allowed file formats
  allowedFormats = ['jpg', 'png', 'gif']

  # blacklist of files to ignore
  filesToIgnore = [
    '.DS_Store'
  ]

  # store number of file found
  countOfFiles = 0

  # store number of files that will be sorted
  countOfSortedFiles = 0

  # open directory of files
  getFiles(workingDirectory).filter( (filename) ->

    # store full path of file
    file = workingDirectory + '/' + filename

    # only attempt to read files, not directories or symlinks
    isFile(file).then( (fileStat) ->
      file if fileStat.isFile()
    )

  ).then( (files) ->

    console.log files

  ).catch( (err) ->

    processError err

  )
