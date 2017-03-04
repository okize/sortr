// modules
let path = require('path');
let fs = require('fs');
let gulp = require('gulp');
let gutil = require('gulp-util');
let plumber = require('gulp-plumber');
let template = require('gulp-template');

// configuration
let readmeTemplate = 'lib/readme.md';

// small wrapper around gulp util logging
let log = msg => gutil.log(gutil.colors.blue(msg));

// returns parsed package.json
let getPackage = () => JSON.parse(fs.readFileSync('./package.json', 'utf8'));

// used to prevent watch from breaking on compilation error
let swallowError = error => log(error, 'error');

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
