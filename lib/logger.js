/* eslint-disable no-console */
const chalk = require('chalk');

// given a timer argument will return time elapsed since timer started
const getProgressTime = (timer) => {
  const diff = process.hrtime(timer);
  const time = ((diff[0] * 1e9) + diff[1]) / 1e9;
  return time.toFixed(3);
};

class Logger {
  constructor(options) {
    this.options = options;
  }

  // logs message types to console with color
  msg(type, msg, timer) {
    // color config
    const colors = {
      status: 'blue',
      move: 'green',
      error: 'red',
      info: 'white',
      warning: 'yellow',
    };

    // log message if verbose flag is set or there is an error
    if (this.options.verbose || (type === 'error')) {
      if (type === 'status') {
        return console.log(`${chalk[colors[type]](msg)} (${getProgressTime(timer)}s)`);
      }
      return console.log(chalk[colors[type]](msg));
    }

    return null;
  }

  // attempt to make human-readble error messages
  error(err) {
    if (err.cause !== null) {
      if (err.cause.code === 'ENOENT') {
        return this.msg('error', 'Directory or file not found, please try again');
      }
      return this.msg('error', err);
    }
    return this.msg('error', err.message);
  }
}

module.exports = Logger;
