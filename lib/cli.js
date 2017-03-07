const path = require('path');
const fs = require('fs');
const sortr = require(path.join(__dirname, '..', 'lib', 'app'));

// output version number of app
const displayVersion = function () {
  const pkg = require(path.join(__dirname, '..', 'package.json'));
  return console.log(pkg.version);
};

// output help documentation of app
const displayHelp = function () {
  const filepath = path.join(__dirname, '..', 'lang', 'help.txt');
  const doc = fs.readFileSync(filepath, 'utf8');
  return console.log(`\n${doc}\n`);
};

module.exports = function (argv) {
  // flags we care about for app operation
  const flags = {
    format: argv.format || argv.f ? argv.format || argv.f : null,
    dryrun: !!(argv.dryrun || argv.d),
    verbose: !!(argv.verbose || argv.v),
    stats: !!(argv.stats || argv.s),
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
