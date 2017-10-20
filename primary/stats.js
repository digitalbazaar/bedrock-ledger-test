/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const bedrock = require('bedrock');
const logger = require('./logger');
require('./ledger');

bedrock.events.on('bedrock-ledger-test.ready', ledgerNode => {
  bedrock.runOnce('ledger-test.addStatsInterval', callback => {
    setInterval(_logStats, 60000);
    callback();
  }, () => {});

  function _logStats() {
    async.auto({
      outstanding: callback => ledgerNode.storage.events.getCount(
        {consensus: false}, callback)
    }, (err, results) => {
      if(err) {
        logger.error('Failure in stats logger.');
        return;
      }
      logger.debug(
        'outstandingEvents',
        {preformatted: {outstandingEvents: results.outstanding}});
    });
  }
});
