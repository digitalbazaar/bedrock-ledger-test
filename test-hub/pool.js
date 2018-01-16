/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const workerpool = require('workerpool');
const path = require('path');

module.exports = workerpool.pool(path.join(__dirname, 'worker.js'));
