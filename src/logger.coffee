chalk = require 'chalk'

class Logger
  constructor: (@options) ->

  # given a number, returns that number truncated to specified decimal place
  _floorFigure: (figure, decimals) ->
    decimals = 2  unless decimals
    d = Math.pow(10, decimals)
    (parseInt(figure * d) / d).toFixed decimals

  # given a timer argument will return time elapsed since timer started
  _getProgressTime: (timer) ->
    diff = process.hrtime(timer)
    time = ((diff[0] * 1e9) + diff[1]) / 1e9
    @_floorFigure(time, 3)

  # logs message types to console with color
  msg: (type, msg, timer) ->

    # color config
    colors =
      status: 'white'
      move: 'green'
      error: 'red'
      info: 'blue'
      warning: 'yellow'

    # log message if verbose flag is set or there is an error
    if @options.verbose || type is 'error'
      if type is 'status'
        console.log chalk[colors[type]](msg) + " (#{@_getProgressTime(timer)}s)"
      else
        console.log chalk[colors[type]](msg)

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
