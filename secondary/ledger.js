/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const bedrock = require('bedrock');
const brLedgerNode = require('bedrock-ledger-node');
const logger = require('./logger');

// module API
const api = {};
module.exports = api;

api.create = (genesisBlock, callback) => {
  async.auto({
    create: callback => brLedgerNode.add(null, {genesisBlock}, callback)
  }, (err, results) => {
    if(err) {
      logger.error('Error while initializing ledger', {error: err});
      return callback(err);
    }
    bedrock.events.emit('bedrock-ledger-test.ready', results.create);
    callback(null, results.create);
  });
};
