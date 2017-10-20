/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const bedrock = require('bedrock');
const brIdentity = require('bedrock-identity');
const config = bedrock.config;
const brLedgerAgent = require('bedrock-ledger-agent');
const logger = require('./logger');

// module API
const api = {};
module.exports = api;

bedrock.events.on('bedrock.started', setupLedger);

function setupLedger(callback) {
  const actor = config['ledger-test'].identities.regularUser.identity.id;
  const options = {
    owner: actor
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
        return bedrock.runOnce(
          'ledger-test.createLedger', _createLedger, err => {
            if(err) {
              return callback(err);
            }
            // run setupLedger again to pick up new ledgerAgent
            setupLedger(callback);
          });
      }
      bedrock.events.emit('bedrock-ledger-test.ready', api.agent.node);
      callback();
    });
  });
}

function _createLedger(callback) {
  const actor = config['ledger-test'].identities.regularUser.identity.id;
  async.auto({
    identity: callback => brIdentity.get(
      null, actor, (err, result) => callback(err, result)),
    create: ['identity', (results, callback) => {
      const options = {
        configEvent: config['ledger-test'].config,
        genesis: true,
        private: false,
        owner: actor
      };
      brLedgerAgent.add(results.identity, null, options, callback);
    }]
  }, err => {
    if(err) {
      logger.error('Error while initializing ledger', {error: err});
      return callback(err);
    }
    callback();
  });
}
