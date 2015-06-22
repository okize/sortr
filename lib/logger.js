var Logger, chalk;

chalk = require('chalk');

Logger = (function() {
  function Logger(options) {
    this.options = options;
  }

  Logger.prototype.msg = function(type, msg) {
    var colors;
    colors = {
      status: 'white',
      dryRun: 'green',
      error: 'red',
      info: 'blue',
      warning: 'yellow'
    };
    if (this.options.verbose) {
      return console.log(chalk[colors[type]](msg));
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
