/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const bedrock = require('bedrock');
const logger = require('./logger');
require('./ledger');

bedrock.events.on('bedrock-ledger-test.ready', ledgerNode => {
  console.log('READY 111111111111111111111111111111111111');
  bedrock.runOnce('ledger-test.addStatsInterval', callback => {
    console.log('SET INTERVAL 222222222222222222222222222222');
    setInterval(_logStats, 60000);
    callback();
  }, () => {});

  function _logStats() {
    console.log('LLLLLLLLLLLLLLLLLLLL', ledgerNode.id);
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
