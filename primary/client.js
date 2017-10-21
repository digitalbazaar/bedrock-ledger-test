/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const bedrock = require('bedrock');
const brLedgerNode = require('bedrock-ledger-node');
const config = bedrock.config;
const ledger = require('./ledger');
const logger = require('./logger');
const randomWords = require('random-words');
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

api.sendStatus = ({ledgerNodeId, publicHostname}, callback) => {
  logger.debug('Sending status.', {url: config['ledger-test'].primaryBaseUrl});
  const baseUri = config.server.baseUri;
  return async.auto({
    ledgerNode: callback =>
      brLedgerNode.get(null, ledgerNodeId, callback),
    latestSummary: ['ledgerNode', (results, callback) =>
      results.ledgerNode.storage.blocks.getLatestSummary(callback)],
    eventsOutstanding: ['ledgerNode', (results, callback) =>
      results.ledgerNode.storage.events.getCount({consensus: false}, callback)],
    eventsTotal: ['ledgerNode', (results, callback) =>
      results.ledgerNode.storage.events.getCount(callback)],
    sendStatus: [
      'eventsTotal', 'eventsOutstanding', 'latestSummary',
      ({eventsOutstanding, eventsTotal, latestSummary}, callback) => request({
        body: {
          baseUri,
          // use object key safe label
          label: `Primary-${randomWords()}`,
          ledgerNodeId,
          logGroupName: config.loggers.cloudwatch.logGroupName,
          logUrl: `${baseUri}/log/app`,
          mongoUrl: `${baseUri}/mongo`,
          privateHostname: config.server.domain,
          publicHostname,
          status: {latestSummary, eventsOutstanding, eventsTotal}
        },
        method: 'POST',
        url: `${config['ledger-test'].primaryBaseUrl}/nodes`,
        json: true,
        strictSSL: false
      }, callback)],
  }, err => callback(err));
};
