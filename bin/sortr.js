#!/usr/bin/env node

const argv = require('optimist').argv;
const cli = require('../lib/cli');

cli(argv);
