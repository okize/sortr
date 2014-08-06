# modules
Promise = require 'bluebird'
fs = Promise.promisifyAll require('fs')
path = require 'path'
_ = require 'lodash'
moment = require 'moment'
chalk = require 'chalk'

mkdirp = require 'mkdirp'
ExifImage = Promise.promisifyAll require('exif').ExifImage
mmm = require 'mmmagic'
Magic = mmm.Magic
magic = Promise.promisifyAll new Magic(mmm.MAGIC_MIME_TYPE)

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

isPhoto = (file) ->
  magic.detectFile(file, (err, result) ->
    if err
      throw err
    if result is 'image/jpeg'
      console.log true
    else
      console.log false
  )

getFiles = (directory) ->
  fs.readdirAsync directory

checkFileType = (file, typeToCheck) ->
  file

getPhotoDate = (file) ->
  new ExifImage({ image: file }, (error, exifData) ->
    exifData
  )

module.exports = (args, opts) ->

  # directory to look for photos in
  # if a directory is not passed as an argument then
  # assume current working directory
  workingDirectory = if args[0] then args[0] else process.cwd()

  # use option format or default if none
  directoryNameFormat = if opts.format then opts.format else 'YYYY_MM_DD'

  # blacklist of files to ignore
  filesToIgnore = [
    '.DS_Store'
  ]

  # store number of files to sort
  countOfFiles = 0

  # open directory of files
  getFiles(workingDirectory).filter( (filename) ->

    filename

    # remove any ignored files
    # !_.contains filesToIgnore, filename
    # filename
    # isPhoto filename

  ).then( (files) ->

    console.log files

  ).catch( (err) ->

    processError err

  )
