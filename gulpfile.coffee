# modules
path = require 'path'
fs = require 'fs'
gulp = require 'gulp'
gutil = require 'gulp-util'
coffee = require 'gulp-coffee'
coffeelint = require 'gulp-coffeelint'
template = require 'gulp-template'
clean = require('del')

# configuration
appRoot = __dirname
readmeTemplate = 'src/readme.md'
sourceDir = 'src/**/*.coffee'
buildDir = 'lib'

# small wrapper around gulp util logging
log = (msg) ->
  gutil.log gutil.colors.blue(msg)

# returns parsed package.json
getPackage = ->
  JSON.parse fs.readFileSync('./package.json', 'utf8')

# default task that's run with 'gulp'
gulp.task 'default', [
  'watch'
]

# watches source files and triggers build on change
gulp.task 'watch', ->
  log 'watching files...'
  gulp.watch sourceDir, ['build', 'lint']

# removes distribution folder
gulp.task 'clean', ->
  log 'deleting build diectory'
  gulp
    .src(buildDir, read: false)
    .pipe(clean())

# lints coffeescript
gulp.task 'lint', ->
  log 'linting coffeescript'
  gulp
    .src(sourceDir)
    .pipe(coffeelint('.coffeelintrc'))
    .pipe(coffeelint.reporter())

# builds coffeescript source into deployable javascript
gulp.task 'build', ->
  log 'compiling coffeescript'
  gulp
    .src(sourceDir)
    .pipe(coffee(
      bare: true
      sourceMap: false
    ).on('error', gutil.log))
    .pipe(
      gulp.dest buildDir
    )

# generates readme.md
gulp.task 'docs', ->
  log 'create documentation'
  pak = getPackage()
  gulp
    .src(readmeTemplate)
    .pipe(template
      name: pak.name
      description: pak.description
      helpfile: fs.readFileSync 'lang/help.txt', 'utf8'
    )
    .pipe(
      gulp.dest './'
    )

# deploys application
gulp.task 'deploy', [
  'docs',
  'clean',
  'build'
]
