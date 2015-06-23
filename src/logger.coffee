chalk = require 'chalk'

class Logger
  constructor: (@options) ->

  # logs message types to console with color
  msg: (type, msg, timer) ->

    # color config
    colors =
      status: 'white'
      dryRun: 'green'
      error: 'red'
      info: 'blue'
      warning: 'yellow'

    # log message if verbose flag is set or there is an error
    if @options.verbose || type is 'error'
      console.log chalk[colors[type]] msg

  # attempt to make human-readble error messages
  error: (err) ->
    if err.cause?
      if err.cause.code == 'ENOENT'
        @msg 'error', 'Directory or file not found, please try again'
      else
        @msg 'error', err
    else
      @msg 'error', err.message

module.exports = Logger
