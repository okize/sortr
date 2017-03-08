const path = require('path');
const fs = require('fs');

const sortr = require('./app');
const Logger = require('./logger');
const project = require('../package.json');

const log = new Logger({ verbose: true });

// output version number of app
const displayVersion = () => log.msg('info', project.version);

// output help documentation of app
const displayHelp = () => {
  const filepath = path.join(__dirname, '..', 'lang', 'help.txt');
  const doc = fs.readFileSync(filepath, 'utf8');
  return log.msg('info', `\n${doc}\n`);
};

module.exports = (argv) => {
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

  return null;
};
