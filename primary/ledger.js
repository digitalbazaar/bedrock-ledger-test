/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const bedrock = require('bedrock');
const config = bedrock.config;
const brLedgerAgent = require('bedrock-ledger-agent');
const logger = bedrock.loggers.get('app').child('ledger-test');

// module API
const api = {};
module.exports = api;

bedrock.events.on('bedrock.started', setupLedger);

function setupLedger() {
  const options = {
    owner: config['ledger-test'].did
  };
  brLedgerAgent.getAgentIterator(null, options, (err, iterator) => {
    if(err) {
      logger.error('Error while scanning for ledger', {error: err});
      return;
    }
    // search all ledger agents (there should only be one in the system)
    let found = false;
    async.eachSeries(iterator, (promise, callback) => {
      promise.then(ledgerAgent => {
        if(ledgerAgent.node.id) {
          found = true;
          api.agent = ledgerAgent;
          callback();
        }
      }).catch(callback);
    }, err => {
      if(err) {
        logger.error('Error while processing ledger agents', {error: err});
      }
      // if no ledger agents are found, create the ledger node and agent
      if(!found) {
        return _createLedger();
      }
      bedrock.events.emit('bedrock-ledger-test.ready', api.agent.node);
    });
  });
}

function _createLedger() {
  async.auto({
    create: callback => {
      const options = {
        configEvent: config['ledger-test'].config,
        genesis: true,
        private: false,
        owner: config['ledger-test'].did
      };
      brLedgerAgent.add(null, null, options, callback);
    }
  }, (err, results) => {
    if(err) {
      logger.error('Error while initializing ledger', {error: err});
    }
    api.agent = results.create;
    bedrock.events.emit('bedrock-ledger-test.ready', api.agent.node);
  });
}
