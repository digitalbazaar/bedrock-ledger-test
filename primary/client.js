/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const bedrock = require('bedrock');
const config = bedrock.config;
const ledger = require('./ledger');
const logger = require('./logger');
let request = require('request');
request = request.defaults({json: true, strictSSL: false});

// module API
const api = {};
module.exports = api;

// TODO: not currently used, but can be used to add ledgers to secondaries.
api.addLedger = (baseUri, callback) => {
  const url = `${baseUri}/ledger-test/ledgers`;
  async.auto({
    genesis: callback => ledger.agent.node.blocks.getGenesis(callback),
    post: ['genesis', (results, callback) => {
      request.post({
        url,
        json: results.genesis.genesisBlock.block
      }, (err, res) => callback(err, {
        statusCode: res.statusCode,
        body: res.body
      }));
    }]
  }, (err, results) => callback(err, results.post));
};

api.sendStatus = (options, callback) => {
  logger.debug('Sending status.', {url: config['ledger-test'].primaryBaseUrl});
  request({
    body: {
      baseUri: config.server.baseUri,
      label: 'Primary - Genesis',
      ledgerNodeId: options.ledgerNodeId,
      privateHostname: config.server.domain,
      publicIp: options.publicIp,
      publicHostname: options.publicHostname
    },
    method: 'POST',
    url: `${config['ledger-test'].primaryBaseUrl}/nodes`,
    json: true,
    strictSSL: false
  }, err => callback(err));
};
