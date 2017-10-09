/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const bedrock = require('bedrock');
const brRest = require('bedrock-rest');
const config = bedrock.config;
const database = require('bedrock-mongodb');
const fs = require('fs');
const ledger = require('./ledger');
const mongoExpress = require('mongo-express/lib/middleware');
const mongoExpressConfig = require('./mongo-express-config');
const os = require('os');
const path = require('path');
let request = require('request');
request = request.defaults({json: true, strictSSL: false});

bedrock.events.on('bedrock-mongodb.ready', callback => {
  database.openCollections(['peer-public-addresses'], callback);
});

bedrock.events.on('bedrock-express.configure.routes', app => {
  const routes = config['ledger-test'].routes;

  app.use(routes.mongoExpress, mongoExpress(mongoExpressConfig));

  app.get(routes.logFile, (req, res, next) => fs.readFile(
    path.join(os.tmpdir(), 'bedrock-ledger-test', `${req.params.logFile}.log`),
    {encoding: 'utf8'}, (err, data) => {
      if(err) {
        return next(err);
      }
      res.setHeader('content-type', 'text/plain');
      res.send(data);
    }));

  // genesis block
  app.get(routes.genesis, brRest.when.prefers.ld, brRest.linkedDataHandler({
    get: (req, res, callback) => ledger.agent.node.blocks.getGenesis(
      (err, result) => callback(err, result.genesisBlock.block))
  }));

  // local latest block
  app.get(routes.latestBlock, brRest.when.prefers.ld, brRest.linkedDataHandler({
    get: (req, res, callback) => ledger.agent.node.blocks.getLatest(
      (err, result) => callback(err, result.eventBlock.block))
  }));

  // peers
  app.get(routes.peers, brRest.when.prefers.ld, brRest.linkedDataHandler({
    get: (req, res, callback) => async.auto({
      peers: callback => database.collections['peer-public-addresses']
        .find().toArray(callback),
      block: ['peers', (results, callback) => async.map(
        results.peers, (peer, callback) => {
          const baseUrl = '/ledger-test/nodes';
          const url = `https://${peer.privateHostname}:18443${baseUrl}/` +
            `${peer.ledgerNodeId}/blocks`;
          request.get(url, (err, result) => {
            if(err) {
              return callback(err);
            }
            peer.latestBlock = result.body.eventBlock.block;
            callback(null, peer);
          });
        }, callback)]
    }, (err, results) => {
      if(err) {
        return callback(err);
      }
      callback(null, results.block);
    })
  }));

  app.post(routes.newNode, brRest.when.prefers.ld, (req, res, next) => {
    async.auto({
      store: callback => database.collections['peer-public-addresses'].insert({
        peer: `https://${req.body.publicIp}:18443/mongo`,
        ledgerNodeId: req.body.ledgerNodeId,
        log: `https://${req.body.publicIp}:18443/log/app`,
        privateHostname: req.body.privateHostname,
        publicHostname: req.body.publicHostname
      }, database.writeOptions, callback)
    }, err => {
      if(err) {
        return next(err);
      }
      res.status(200).end();
    });
  });
});
