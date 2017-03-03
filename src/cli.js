let path = require('path');
let fs = require('fs');
let sortr = require(path.join(__dirname, '..', 'lib', 'app'));

// output version number of app
let displayVersion = function() {

  let pkg = require(path.join(__dirname, '..', 'package.json'));
  return console.log(pkg.version);
};

// output help documentation of app
let displayHelp = function() {

  let filepath = path.join(__dirname, '..', 'lang', 'help.txt');
  let doc = fs.readFileSync(filepath, 'utf8');
  return console.log(`\n${doc}\n`);
};

module.exports = function(argv) {

  // flags we care about for app operation
  let flags = {
    format: argv.format || argv.f ? argv.format || argv.f : null,
    dryrun: argv.dryrun || argv.d ? true : false,
    verbose: argv.verbose || argv.v ? true : false,
    stats: argv.stats || argv.s ? true : false
  };

  // args passed
  if (argv._.length > 0) { return sortr(argv._, flags); }

  // --version
  if (argv.version || argv.V) { return displayVersion(); }

  // --help
  if (argv.help || argv.h) { return displayHelp(); }

  // no args so display help
  if (!argv._.length) { return displayHelp(); }
};
