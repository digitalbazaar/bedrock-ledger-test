/*
 * Copyright (c) 2017-2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const _ = require('lodash');
const async = require('async');
const bedrock = require('bedrock');
const brIdentity = require('bedrock-identity');
const brLedgerAgent = require('bedrock-ledger-agent');
const brLedgerNode = require('bedrock-ledger-node');
const logger = require('./logger');
const request = require('request');
const url = require('url');
const {promisify} = require('util');
const getAgentIterator = promisify(brLedgerAgent.getAgentIterator);
const {config, util: {BedrockError}} = bedrock;

// module API
const api = {};
module.exports = api;

bedrock.events.on('bedrock.started', async () => {
  let ledgerAgent;
  while(!ledgerAgent) {
    ({ledgerAgent} = await _setupLedger());
    if(!ledgerAgent) {
      // wait a second before trying again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  logger.debug(
    'Successfully initialized ledger agent in worker.',
    {ledgerAgentId: ledgerAgent.id});
  api.agent = ledgerAgent;
  return bedrock.events.emit('bedrock-ledger-test.ledger-ready');
});

async function _setupLedger() {
  // check to see if the agent already exists
  try {
    const ledgerAgent = await _findAgent();
    return {ledgerAgent};
  } catch(e) {
    if(e.name !== 'NotFoundError') {
      throw e;
    }
  }
  // ledgerAgent was not found and needs to be initialized
  let setup;
  if(config['ledger-test'].peers.length === 0) {
    // this is the genesis node - no ledger agents, no peers
    setup = _setupGenesisNode;
  } else {
    // this is a peer node - no ledger agents, list of peers
    setup = _setupPeerNode;
  }
  return new Promise((resolve, reject) => bedrock.runOnce(
    'ledger-test.setupLedger', setup, err => err ? reject(err) :
      resolve({ledgerAgent: null})));
}

async function _findAgent() {
  const options = {
    owner: config['ledger-test'].identities.regularUser.identity.id
  };
  let iterator;
  try {
    iterator = await getAgentIterator(null, options);
  } catch(e) {
    logger.error('Error while scanning for ledger', {error: e});
    throw e;
  }
  for(const promise of iterator) {
    const ledgerAgent = await promise;
    if(ledgerAgent.ledgerNode.id) {
      return ledgerAgent;
    }
  }
  throw new BedrockError('Ledger agent not found.', 'NotFoundError');
}

// setup the genesis node
function _setupGenesisNode(callback) {
  async.auto({
    ledgerOwner: callback => _getLedgerOwner({nodeType: 'genesis'}, callback),
    // generate the Maintainers's DID Document
    buildConfig: callback => {
      const ledgerConfig = config['ledger-test'].config;
      callback(null, ledgerConfig);
    },
    create: ['ledgerOwner', 'buildConfig', (results, callback) => {
      // create ledger
      const options = {
        ledgerConfiguration: results.buildConfig,
        genesis: true,
        public: true,
        owner: results.ledgerOwner.id,
      };
      brLedgerAgent.add(results.ledgerOwner, null, options, callback);
    }]
  }, err => {
    if(err) {
      logger.error('Error while initializing ledger', {error: err});
      return callback(err);
    }
    callback();
  });
}

// setup a peer node by fetching the genesis block from another peer
function _setupPeerNode(callback) {
  logger.debug('Retrieving genesis block from peers',
    {peers: config['ledger-test'].peers});
  const strictSSL = config.jsonld.strictSSL;

  async.auto({
    ledgerOwner: callback => _getLedgerOwner({nodeType: 'peer'}, callback),
    genesisBlock: callback => async.retry(
      {times: 300, interval: 5000}, callback => {
        const peer = _.sample(config['ledger-test'].peers);
        request({
          method: 'GET',
          url: url.resolve(peer, '/ledger-agents/'),
          json: true,
          strictSSL
        }, callback);
      }, (err, res) => {
        if(err) {
          return callback(err);
        }
        if(res.statusCode !== 200) {
          logger.debug('Error retrieving peer ledger agents.', {
            statusCode: res.statusCode,
            body: res.body
          });
          return callback(new Error('Error retrieving peer ledger agents.'));
        }
        request({
          method: 'GET',
          // FIXME: Ensure we're connecting to the right ledger
          url: res.body.ledgerAgent[0].service.ledgerBlockService,
          json: true,
          strictSSL
        }, callback);
      },
      callback),
    ledgerNode: ['genesisBlock', 'ledgerOwner', (results, callback) => {
      const genesisBlock = results.genesisBlock[0].body.genesis.block;

      brLedgerNode.add(null, {genesisBlock}, callback);
    }],
    ledgerAgent: ['ledgerNode', (results, callback) => {
      const options = {
        public: true,
        owner: results.ledgerOwner.id,
      };
      brLedgerAgent.add(null, results.ledgerNode.id, options, callback);
    }],
  }, err => {
    if(err) {
      logger.error('Failed to retrieve genesis block from peers.', err);
      return callback(err);
    }
    logger.debug('Successfully retrieved genesis block from peers.');
    callback();
  });
}

function _getLedgerOwner(options, callback) {
  const actor = config['ledger-test'].identities.regularUser.identity.id;
  return brIdentity.get(
    null, actor, (err, identity) => callback(err, identity));
}
