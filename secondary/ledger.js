/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const bedrock = require('bedrock');
const config = bedrock.config;
const brLedgerNode = require('bedrock-ledger-node');
const logger = bedrock.loggers.get('app').child('ledger-test');

// module API
const api = {};
module.exports = api;

// if(!bedrock.program.aws) {
//   bedrock.events.on('bedrock.started', callback =>
//     api.create(config['ledger-test'].genesisBlock, callback));
// }

api.create = (genesisBlock, callback) => {
  console.log('GGGGGGGGGGG', JSON.stringify(genesisBlock, null, 2));
  async.auto({
    create: callback => brLedgerNode.add(null, {genesisBlock}, callback)
  }, (err, results) => {
    if(err) {
      logger.error('Error while initializing ledger', {error: err});
      return callback(err);
    }
    api.node = results.create;
    bedrock.events.emit('bedrock-ledger-test.ready', api.node);
    callback();
  });
};
