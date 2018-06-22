#!/usr/bin/env node

const { argv } = require('optimist');
const cli = require('../lib/cli');

cli(argv);
