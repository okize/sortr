# modules
Promise = require 'bluebird'
fs = Promise.promisifyAll require('fs')
path = require 'path'
readChunk = require 'read-chunk'
isJpg = require 'is-jpg'
_ = require 'lodash'
moment = require 'moment'
chalk = require 'chalk'
mkdirp = require 'mkdirp'

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

isPhoto = (file) ->
  isJpg readChunk.sync(file, 0, 3)

module.exports = (args, opts) ->

  # directory to look for photos in
  # if a directory is not passed as an argument then
  # assume current working directory
  workingDirectory = if args[0] then args[0] else process.cwd()

  # use option format or default if none
  directoryNameFormat = if opts.format then opts.format else 'YYYY_MM_DD'

  # option to only sort jpegs not other types of photos
  onlyPhotos = if opts.photos then opts.photos else true

  # open directory of files
  getFiles(workingDirectory)
  .filter( (filename) ->

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

    console.log files

  ).catch( (err) ->

    processError err

  )
