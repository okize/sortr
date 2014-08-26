[![NPM version](http://img.shields.io/npm/v/sortr.svg?style=flat)](https://www.npmjs.org/package/sortr)
[![Dependency Status](http://img.shields.io/david/okize/sortr.svg?style=flat)](https://david-dm.org/okize/sortr)
[![Downloads](http://img.shields.io/npm/dm/sortr.svg?style=flat)](https://www.npmjs.org/package/sortr)

# Sortr

## Description
CLI tool that organizes a directory of photos by sorting them into subdirectories named after date the photo was taken

## Usage

```
Usage:

  sortr [inputDirectory] [outputDirectory] -options

Description:

  CLI tool that organizes a directory of photos by sorting them into subdirectories named after date the photo was taken

Options:

  -h, --help           Output usage information
  -V, --version        Output version number
  -f, --format         Directory naming format (default is YYYY_MM_DD)
  -d, --dryrun         Does a dry-run of where photos will be moved to
  -s, --stats          Displays application statistics at completion
  -v, --verbose        Verbose mode logs application progress to the console

Examples:

  $ sortr ./example ./sortedExample -f "DD_MM_YY"

```

## License

Released under the [MIT License](http://www.opensource.org/licenses/mit-license.php).
