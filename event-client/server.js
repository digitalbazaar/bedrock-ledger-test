/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const bedrock = require('bedrock');
const brRest = require('bedrock-rest');
const config = bedrock.config;
const database = require('bedrock-mongodb');
const helpers = require('./helpers');
let request = require('request');
request = request.defaults({json: true, strictSSL: false});

let actor;

bedrock.events.on('bedrock-express.configure.routes', app => {
  actor = config['ledger-test'].identities.regularUser;
  const routes = config['ledger-test'].routes;

  app.get(routes.agents, brRest.when.prefers.ld, brRest.linkedDataHandler({
    get: (req, res, callback) => async.auto({
      scan: callback => _scanAgents(callback),
      agents: ['scan', (results, callback) =>
        database.collections.ledgerAgent.find().toArray(callback)]
    }, (err, results) => {
      if(err) {
        return callback(err);
      }
      callback(null, results.agents);
    })
  }));

  app.post(routes.eventNum, (req, res, next) => {
    const query = {
      id: database.hash(req.params.agentId)
    };
    const update = {
      $set: {'meta.eventsPerSec': req.body.eventsPerSec}
    };
    database.collections.ledgerAgent.update(query, update, err => {
      console.log('Updated', req.params.agentId, req.body.eventsPerSec);
      if(err) {
        console.log('ERROR', err);
        return next(err);
      }
      res.status(200).end();
    });
  });

});

function _scanAgents(callback) {
  const peersUrl = config['ledger-test'].primaryBaseUrl + '/peers';
  async.auto({
    peers: callback => request.get(peersUrl, (err, res) => callback(err, res)),
    ledgerAgent: ['peers', (results, callback) => {
      const peers = results.peers.body.map(r => r.last);
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
    // only log errors
    callback();
  });
}
