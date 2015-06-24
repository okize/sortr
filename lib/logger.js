var Logger, chalk;

chalk = require('chalk');

Logger = (function() {
  function Logger(options) {
    this.options = options;
  }

  Logger.prototype._floorFigure = function(figure, decimals) {
    var d;
    if (!decimals) {
      decimals = 2;
    }
    d = Math.pow(10, decimals);
    return (parseInt(figure * d) / d).toFixed(decimals);
  };

  Logger.prototype._getProgressTime = function(timer) {
    var diff, time;
    diff = process.hrtime(timer);
    time = ((diff[0] * 1e9) + diff[1]) / 1e9;
    return this._floorFigure(time, 3);
  };

  Logger.prototype.msg = function(type, msg, timer) {
    var colors;
    colors = {
      status: 'white',
      dryRun: 'green',
      error: 'red',
      info: 'blue',
      warning: 'yellow'
    };
    if (this.options.verbose || type === 'error') {
      if (type === 'status') {
        return console.log(chalk[colors[type]](msg) + (" (" + (this._getProgressTime(timer)) + "s)"));
      } else {
        return console.log(chalk[colors[type]](msg));
      }
    }
  };

  Logger.prototype.error = function(err) {
    if (err.cause != null) {
      if (err.cause.code === 'ENOENT') {
        return this.msg('error', 'Directory or file not found, please try again');
      } else {
        return this.msg('error', err);
      }
    } else {
      return this.msg('error', err.message);
    }
  };

  return Logger;

})();

module.exports = Logger;
