/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const bedrock = require('bedrock');
const brLedgerNode = require('bedrock-ledger-node');
const cache = require('bedrock-redis');
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
        const valid = result.filter(i => i !== null).map(i => parseInt(i, 10));
        if(valid.length === 0) {
          return callback(null, 0);
        }
        const sum = valid.reduce((a, b) => a + b, 0);
        callback(null, Math.round(sum / valid.length));
      });
    },
    eventsPerSecond: callback => {
      // local events per second
      const thisSecond = Math.round(Date.now() / 1000);
      const lni = ledgerNodeId.substr(-36);
      const maxSeconds = 60;
      const op = [];
      for(let i = 1; i <= maxSeconds; ++i) {
        op.push(`lec|${lni}|${thisSecond - i}`);
      }
      cache.client.mget(op, (err, result) => {
        if(err) {
          return callback(err);
        }
        const valid = result.filter(i => i !== null).map(i => parseInt(i, 10));
        if(valid.length === 0) {
          return callback(null, 0);
        }
        const sum = valid.reduce((a, b) => a + b, 0);
        // average by the number of valid samples
        callback(null, Math.round(sum / valid.length));
      });
    },
    peerEventsPerSecond: callback => {
      // local events per second
      const thisSecond = Math.round(Date.now() / 1000);
      const lni = ledgerNodeId.substr(-36);
      const maxSeconds = 60;
      const op = [];
      for(let i = 1; i <= maxSeconds; ++i) {
        op.push(`pec|${lni}|${thisSecond - i}`);
      }
      cache.client.mget(op, (err, result) => {
        if(err) {
          return callback(err);
        }
        const valid = result.filter(i => i !== null).map(i => parseInt(i, 10));
        if(valid.length === 0) {
          return callback(null, 0);
        }
        const sum = valid.reduce((a, b) => a + b, 0);
        // average by the number of valid samples
        callback(null, Math.round(sum / valid.length));
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
      "peerEventsPerSecond",
      ({dups, eventsOutstanding, eventsPerSecond, eventsTotal, latestSummary,
        mergeEventsOutstanding, mergeEventsTotal, peerEventsPerSecond},
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
              eventsPerSecond,
              mergeEventsOutstanding,
              mergeEventsTotal,
              outstanding: eventsOutstanding,
              peerEventsPerSecond,
              total: eventsTotal,
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
