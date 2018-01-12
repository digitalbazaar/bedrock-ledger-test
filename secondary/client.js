/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const bedrock = require('bedrock');
const brLedgerNode = require('bedrock-ledger-node');
const cache = require('bedrock-redis');
const config = bedrock.config;
const logger = require('./logger');
const request = require('request');

const api = {};
module.exports = api;

api.getGenesis = callback => request({
  method: 'GET',
  url: `${config['ledger-test'].primaryBaseUrl}/genesis`,
  json: true,
  strictSSL: false
}, (err, res) => callback(err, res));

api.sendStatus = ({label, ledgerNodeId, publicHostname}, callback) => {
  logger.debug('Sending status.', {url: config['ledger-test'].primaryBaseUrl});
  const baseUri = config.server.baseUri;
  return async.auto({
    dups: callback => {
      const thisMinute = Math.round(Date.now() / 60000);
      // get values for the last 3 prior minutes to avoid incomplete data for
      // current minute
      cache.client.mget([
        `dup-${thisMinute - 1}`,
        `dup-${thisMinute - 2}`,
        `dup-${thisMinute - 3}`,
      ], (err, result) => {
        if(err) {
          return callback(err);
        }
        const valid = result.map(i => parseInt(i, 10)).filter(i => i !== NaN);
        const sum = valid.reduce((a, b) => a + b);
        callback(null, sum.length === 0 ? 0 : Math.round(sum / valid.length));
      });
    },
    ledgerNode: callback =>
      brLedgerNode.get(null, ledgerNodeId, callback),
    latestSummary: ['ledgerNode', (results, callback) =>
      results.ledgerNode.storage.blocks.getLatestSummary(callback)],
    eventsOutstanding: ['ledgerNode', (results, callback) =>
      results.ledgerNode.storage.events.getCount({consensus: false}, callback)],
    eventsTotal: ['ledgerNode', (results, callback) =>
      results.ledgerNode.storage.events.getCount(callback)],
    mergeEventsTotal: ['ledgerNode', (results, callback) =>
      results.ledgerNode.storage.events.collection.find({
        'event.type': 'ContinuityMergeEvent'
      }).count(callback)],
    mergeEventsOutstanding: ['ledgerNode', (results, callback) =>
      results.ledgerNode.storage.events.collection.find({
        'event.type': 'ContinuityMergeEvent',
        'meta.consensus': {$exists: false}
      }).count(callback)],
    sendStatus: [
      'dups', 'eventsTotal', 'eventsOutstanding', 'latestSummary',
      'mergeEventsOutstanding', 'mergeEventsTotal',
      ({dups, eventsOutstanding, eventsTotal, latestSummary,
        mergeEventsOutstanding, mergeEventsTotal},
      callback) => request({
        body: {
          baseUri,
          // use object key safe label
          label,
          ledgerNodeId,
          logGroupName: config.loggers.cloudwatch.logGroupName,
          logUrl: `https://${publicHostname}:${config.server.port}/log/app`,
          mongoUrl: `https://${publicHostname}:${config.server.port}/mongo`,
          privateHostname: config.server.domain,
          publicHostname,
          status: {
            latestSummary,
            events: {
              dups,
              mergeEventsOutstanding,
              mergeEventsTotal,
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
