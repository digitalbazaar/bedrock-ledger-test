/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const bedrock = require('bedrock');
const logger = require('./logger');
const scheduler = require('bedrock-jobs');
require('./ledger');

bedrock.events.on('bedrock-ledger-test.ready', ledgerNode => {
  scheduler.define(
    'bedrock-ledger-test.stats.logStats', _logStats);

  function _logStats(job, callback) {
    async.auto({
      outstanding: callback => ledgerNode.storage.events.getCount(
        {consensus: false}, callback)
    }, (err, results) => {
      if(err) {
        logger.error('Failure in stats logger.');
        return callback(err);
      }
      logger.debug(
        'outstandingEvents',
        {preformatted: {outstandingEvents: results.outstanding}});
      callback();
    });
  }
});
