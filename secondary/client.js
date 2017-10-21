/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const bedrock = require('bedrock');
const brLedgerNode = require('bedrock-ledger-node');
const config = bedrock.config;
const logger = require('./logger');
const request = require('request');
const randomWords = require('random-words');

const api = {};
module.exports = api;

api.getGenesis = callback => request({
  method: 'GET',
  url: `${config['ledger-test'].primaryBaseUrl}/genesis`,
  json: true,
  strictSSL: false
}, (err, res) => callback(err, res));

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
          label: `Secondary-${randomWords()}`,
          ledgerNodeId,
          logGroupName: config.loggers.cloudwatch.logGroupName,
          logUrl: `${baseUri}/log/app`,
          mongoUrl: `${baseUri}/mongo`,
          privateHostname: config.server.domain,
          publicHostname,
          status: {
            latestSummary,
            events: {
              outstanding: eventsOutstanding,
              total: eventsTotal
            }
          }
        },
        method: 'POST',
        url: `${config['ledger-test'].primaryBaseUrl}/nodes`,
        json: true,
        strictSSL: false
      }, callback)],
  }, err => callback(err));
};
