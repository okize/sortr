# modules
path = require 'path'
fs = require 'fs'
app = require path.join(__dirname, '..', 'lib', 'app')

# output version number of app
displayVersion = ->

  pkg = require path.join(__dirname, '..', 'package.json')
  console.log pkg.version

# output help documentation of app
displayHelp = ->

  filepath = path.join(__dirname, '..', 'lang', 'help.txt')
  doc = fs.readFileSync filepath, 'utf8'
  console.log '\n' + doc + '\n'

module.exports = (argv) ->

  console.log argv

  # flags we care about for app operation
  flags =
    format: if argv.format or argv.f then argv.format or argv.f else null

  # args passed
  return app(argv._, flags) if argv._.length > 0

  # --version
  return displayVersion() if argv.version or argv.V

  # --help
  return displayHelp() if argv.help or argv.h

  # no args so display help
  displayHelp() unless argv._.length