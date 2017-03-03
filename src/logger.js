let chalk = require('chalk');

class Logger {
  constructor(options) {
    this.options = options;
  }

  // given a number, returns that number truncated to specified decimal place
  _floorFigure(figure, decimals) {
    if (!decimals) { decimals = 2; }
    let d = Math.pow(10, decimals);
    return (parseInt(figure * d) / d).toFixed(decimals);
  }

  // given a timer argument will return time elapsed since timer started
  _getProgressTime(timer) {
    let diff = process.hrtime(timer);
    let time = ((diff[0] * 1e9) + diff[1]) / 1e9;
    return this._floorFigure(time, 3);
  }

  // logs message types to console with color
  msg(type, msg, timer) {

    // color config
    let colors = {
      status: 'white',
      move: 'green',
      error: 'red',
      info: 'blue',
      warning: 'yellow'
    };

    // log message if verbose flag is set or there is an error
    if (this.options.verbose || (type === 'error')) {
      if (type === 'status') {
        return console.log(chalk[colors[type]](msg) + ` (${this._getProgressTime(timer)}s)`);
      } else {
        return console.log(chalk[colors[type]](msg));
      }
    }
  }

  // attempt to make human-readble error messages
  error(err) {
    if (err.cause != null) {
      if (err.cause.code === 'ENOENT') {
        return this.msg('error', 'Directory or file not found, please try again');
      } else {
        return this.msg('error', err);
      }
    } else {
      return this.msg('error', err.message);
    }
  }
}

module.exports = Logger;
