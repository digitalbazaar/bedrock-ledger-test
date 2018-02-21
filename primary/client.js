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
    duration: callback => cache.client.mget(
      `aggregate|${ledgerNodeId}`,
      `findConsensus|${ledgerNodeId}`,
      `recentHistoryMergeOnly|${ledgerNodeId}`,
      (err, result) => {
        if(err) {
          return callback(err);
        }
        callback(null, {
          aggregate: parseInt(result[0], 10) || 0,
          findConsensus: parseInt(result[1], 10) || 0,
          recentHistoryMergeOnly: parseInt(result[2], 10) || 0,
        });
      }
    ),
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
    eventsPerSecondLocal: callback => {
      // local events per second
      const thisSecond = Math.round(Date.now() / 1000);
      const lni = ledgerNodeId.substr(-36);
      const maxSeconds = 600;
      const op = [];
      for(let i = 1; i <= maxSeconds; ++i) {
        op.push(`ecl|${lni}|${thisSecond - i}`);
      }
      cache.client.mget(op, (err, result) => {
        if(err) {
          return callback(err);
        }
        const valid = result.map(i => parseInt(i, 10) || 0);
        const sum = valid.reduce((a, b) => a + b, 0);
        // average by the number of valid samples
        callback(null, Math.round(sum / valid.length));
      });
    },
    eventsPerSecondPeer: callback => {
      // local events per second
      const thisSecond = Math.round(Date.now() / 1000);
      const lni = ledgerNodeId.substr(-36);
      const maxSeconds = 600;
      const op = [];
      for(let i = 1; i <= maxSeconds; ++i) {
        op.push(`ecp|${lni}|${thisSecond - i}`);
      }
      cache.client.mget(op, (err, result) => {
        if(err) {
          return callback(err);
        }
        const valid = result.map(i => parseInt(i, 10) || 0);
        const sum = valid.reduce((a, b) => a + b, 0);
        // average by the number of valid samples
        callback(null, Math.round(sum / valid.length));
      });
    },
    ledgerNode: callback => {
      console.log('AAAAAAAAAAAAAAAAAAAAA');
      brLedgerNode.get(null, ledgerNodeId, (err, result) => {
        console.log('BBBBBBBBBBBBBB', result.id);
        callback(err, result);
      });
    },
    avgConsensusTime: ['ledgerNode', (results, callback) =>
      results.ledgerNode.storage.events.collection.aggregate([
        {$match: {
          'meta.consensus': {$exists: true}, 'meta.continuity2017.type': 'm'
        }},
        {$project: {
          consensusTime: {$subtract: ['$meta.consensusDate', '$meta.created']}
        }},
        {$group: {
          _id: null,
          avgConsensusTime: {$avg: '$consensusTime'}
        }}
      ]).toArray((err, result) => {
        if(err) {
          return callback(err);
        }
        callback(null, result[0].avgConsensusTime);
      })
    ],
    latestSummary: ['ledgerNode', (results, callback) =>
      results.ledgerNode.storage.blocks.getLatestSummary(callback)],
    eventsOutstanding: ['ledgerNode', (results, callback) =>
      results.ledgerNode.storage.events.getCount({consensus: false}, callback)],
    eventsTotal: ['ledgerNode', (results, callback) =>
      results.ledgerNode.storage.events.getCount(callback)],
    mergeEventsTotal: ['ledgerNode', (results, callback) =>
      results.ledgerNode.storage.events.collection.count({
        'meta.continuity2017.type': 'm'
      }, callback)],
    mergeEventsOutstanding: ['ledgerNode', (results, callback) =>
      results.ledgerNode.storage.events.collection.count({
        'meta.continuity2017.type': 'm',
        'meta.consensus': {$exists: false}
      }, callback)],
    sendStatus: [
      'avgConsensusTime', 'dups', 'duration', 'eventsTotal',
      'eventsOutstanding', 'eventsPerSecondLocal', 'eventsPerSecondPeer',
      'latestSummary', 'mergeEventsOutstanding', 'mergeEventsTotal',
      ({avgConsensusTime, dups, duration, eventsOutstanding,
        eventsPerSecondLocal, eventsPerSecondPeer, eventsTotal, latestSummary,
        mergeEventsOutstanding, mergeEventsTotal
      }, callback) => {
        console.log('CCCCCCCCCCCCCCCCCCCCCCCCCC');
        request({
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
              duration,
              events: {
                avgConsensusTime,
                dups,
                eventsPerSecondLocal,
                eventsPerSecondPeer,
                mergeEventsOutstanding,
                mergeEventsTotal,
                outstanding: eventsOutstanding,
                total: eventsTotal,
              }
            }
          },
          method: 'POST',
          url: `${config['ledger-test'].primaryBaseUrl}/nodes`,
          json: true,
          strictSSL: false
        }, callback);
      }],
  }, (err, result) => {
    console.log('ZZZZZZZZZ', err, result);
    callback(err);
  });
};
