// modules
let path = require('path');
let fs = require('fs');
let gulp = require('gulp');
let gutil = require('gulp-util');
let coffee = require('gulp-coffee');
let coffeelint = require('gulp-coffeelint');
let plumber = require('gulp-plumber');
let template = require('gulp-template');
let clean = require('del');

// configuration
let appRoot = __dirname;
let readmeTemplate = 'src/readme.md';
let sourceDir = 'src/**/*.coffee';
let buildDir = 'lib';

// small wrapper around gulp util logging
let log = msg => gutil.log(gutil.colors.blue(msg));

// returns parsed package.json
let getPackage = () => JSON.parse(fs.readFileSync('./package.json', 'utf8'));

// used to prevent watch from breaking on compilation error
let swallowError = error => log(error, 'error');

// default task that's run with 'gulp'
gulp.task('default', [
  'watch'
]);

// watches source files and triggers build on change
gulp.task('watch', function() {
  log('watching files...');
  return gulp.watch(sourceDir, ['build', 'lint']);});

// removes distribution folder
gulp.task('clean', function() {
  log('deleting build diectory');
  return gulp
    .src(buildDir, {read: false})
    .pipe(clean());
});

// lints coffeescript
gulp.task('lint', function() {
  log('linting coffeescript');
  return gulp
    .src(sourceDir)
    .pipe(coffeelint('.coffeelintrc'))
    .pipe(coffeelint.reporter());
});

// builds coffeescript source into deployable javascript
gulp.task('build', function() {
  log('compiling coffeescript');
  return gulp
    .src(sourceDir)
    .pipe(plumber())
    .pipe(coffee({
      bare: true,
      sourceMap: false
    }))
    .on('error', swallowError)
    .pipe(
      gulp.dest(buildDir)
    );
});

// generates readme.md
gulp.task('docs', function() {
  log('create documentation');
  let pak = getPackage();
  return gulp
    .src(readmeTemplate)
    .pipe(template({
      name: pak.name,
      description: pak.description,
      helpfile: fs.readFileSync('lang/help.txt', 'utf8')
    }))
    .pipe(
      gulp.dest('./')
    );
});

// deploys application
gulp.task('deploy', [
  'docs',
  'clean',
  'build'
]);
