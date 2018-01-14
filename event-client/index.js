/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const bedrock = require('bedrock');
const config = bedrock.config;
const database = require('bedrock-mongodb');
const helpers = require('./helpers');
const pool = require('./pool');
// const worker = require('./worker');
let request = require('request');
request = request.defaults({json: true, strictSSL: false});
const scheduler = require('bedrock-jobs');
require('bedrock-ledger-context');
require('bedrock-express');
require('bedrock-webpack');
require('bedrock-views');
require('./server');

require('./config');

bedrock.events.on('bedrock-cli.init', () => bedrock.program.option(
  '--aws',
  'Configure for AWS.'
));

bedrock.events.on('bedrock-cli.parsed', callback => {
  if(bedrock.program.aws) {
    require('./config-aws');
    const metaBase = 'http://169.254.169.254/latest/meta-data';
    const lhn = `${metaBase}/local-hostname/`;
    return async.auto({
      lhn: callback => request.get(lhn, (err, res) => callback(err, res.body)),
    }, (err, results) => {
      if(err) {
        return callback(err);
      }
      config.server.domain = results.lhn;
      callback();
    });
  }
  callback();
});

bedrock.events.on('bedrock-mongodb.ready', callback => async.auto({
  open: callback => database.openCollections(['ledgerAgent'], callback),
  drop: ['open', (results, callback) =>
    database.collections.ledgerAgent.remove({}, callback)],
  openCollections: ['drop', (results, callback) => database.openCollections(
    ['ledgerAgent'], callback)],
  createIndexes: ['openCollections', (results, callback) =>
    database.createIndexes([{
      collection: 'ledgerAgent',
      fields: {id: 1},
      options: {unique: true, background: false}
    }], callback)]
}, err => callback(err)));

bedrock.events.on('bedrock.init', () => {
  scheduler.define('bedrock-ledger-test.sendEvents', _sendEvents);
  scheduler.define('bedrock-ledger-test.scanAgents', _scanAgents);
});

const actor = config['ledger-test'].identities.regularUser;

function _scanAgents(job, callback) {
  const peersUrl = config['ledger-test'].primaryBaseUrl + '/peers';
  async.auto({
    peers: callback => request.get(peersUrl, (err, res) => callback(err, res)),
    ledgerAgent: ['peers', (results, callback) => {
      const peers = results.peers.body;
      async.each(peers, (p, callback) => async.auto({
        get: callback => {
          const host = p.privateHostname;
          const url = `https://${host}:18443/ledger-agents`;
          request.get(helpers.createHttpSignatureRequest({
            url,
            identity: actor
          }), (err, res) => callback(err, res));
        },
        store: ['get', (results, callback) => {
          const ledgerAgent = results.get.body[0];
          if(!ledgerAgent) {
            return new Error('Missing ledgerAgent data.');
          }
          const agent = {
            id: database.hash(ledgerAgent.id),
            ledgerAgent,
            meta: {
              eventsPerSec: config['ledger-test'].eventsPerSec,
              label: p.label
            }
          };
          database.collections.ledgerAgent.insert(
            agent, database.writeOptions, err => {
              if(err && !database.isDuplicateError(err)) {
                return callback(err);
              }
              callback();
            });
        }]
      }, callback), callback);
    }]
  }, err => {
    if(err) {
      console.log('ERROR', err);
    }
    callback(err);
  });
}

function _sendEvents(job, callback) {
  async.auto({
    agents: callback => database.collections.ledgerAgent.find()
      .toArray(callback),
    send: ['agents', (results, callback) =>
      async.each(results.agents, (agent, callback) => {
        const eventService = agent.ledgerAgent.service.ledgerEventService;
        console.log(Date.now(), agent.meta.label, agent.meta.eventsPerSec);
        pool.exec('sendEvent', [
          {actor, eventNum: agent.meta.eventsPerSec, eventService}
        ]).catch(err => console.error(err));
        callback();
      }, callback)]
  }, callback);
}

bedrock.start();
