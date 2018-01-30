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
}, (err, res) => {
  if(err || res.statusCode !== 200) {
    logger.debug('Error retrieving genesis block.');
    return callback(new Error('Could not retrieve genesis block.'));
  }
  callback(null, res.body);
});

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
        `dup-${thisMinute - 4}`,
        `dup-${thisMinute - 5}`,
      ], (err, result) => {
        if(err) {
          return callback(err);
        }
        const valid = result.map(i => parseInt(i, 10))
          .filter(i => !Number.isNaN(i));
        const sum = valid.reduce((a, b) => a + b, 0);
        callback(null, Math.round(sum / result.length));
      });
    },
    eventsPerSecond: callback => {
      const thisSecond = Math.round(Date.now() / 1000);
      // get values for the last 5 seconds
      const lni = ledgerNodeId.substr(-36);
      const maxSeconds = 60;
      const op = [];
      for(let i = 1; i <= maxSeconds; ++i) {
        op.push(`ec|${lni}|${thisSecond - i}`);
      }
      cache.client.mget(op, (err, result) => {
        if(err) {
          return callback(err);
        }
        const valid = result.map(i => parseInt(i, 10))
          .filter(i => !Number.isNaN(i));
        const sum = valid.reduce((a, b) => a + b, 0);
        callback(null, Math.round(sum / result.length));
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
      results.ledgerNode.storage.events.collection.count({
        'event.type': 'ContinuityMergeEvent'
      }, callback)],
    mergeEventsOutstanding: ['ledgerNode', (results, callback) =>
      results.ledgerNode.storage.events.collection.count({
        'event.type': 'ContinuityMergeEvent',
        'meta.consensus': {$exists: false}
      }, callback)],
    sendStatus: [
      'dups', 'eventsTotal', 'eventsOutstanding', 'eventsPerSecond',
      'latestSummary', 'mergeEventsOutstanding', 'mergeEventsTotal',
      ({dups, eventsOutstanding, eventsPerSecond, eventsTotal, latestSummary,
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
              eventsPerSecond,
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
