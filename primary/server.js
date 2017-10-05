/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const bedrock = require('bedrock');
const brRest = require('bedrock-rest');
const client = require('./client');
const config = bedrock.config;
const database = require('bedrock-mongodb');
const fs = require('fs');
const mongoExpress = require('mongo-express/lib/middleware');
const mongoExpressConfig = require('./mongo-express-config');

bedrock.events.on('bedrock-mongodb.ready', callback => {
  database.openCollections(['peer-public-addresses'], callback);
});

bedrock.events.on('bedrock-express.configure.routes', app => {
  const routes = config['ledger-test'].routes;

  app.use(routes.mongoExpress, mongoExpress(mongoExpressConfig));

  app.get(routes.logFile, (req, res, next) => fs.readFile(
    '/var/log/bedrock-ledger-test/app.log', {encoding: 'utf8'}, (err, data) => {
      if(err) {
        return next(err);
      }
      res.setHeader('content-type', 'text/plain');
      res.send(data);
    }));

  app.post(routes.newNode, brRest.when.prefers.ld, (req, res, next) => {
    async.auto({
      client: callback => client.addLedger(req.body.baseUri, callback),
      store: callback => database.collections['peer-public-addresses'].insert({
        peer: `https://${req.body.publicIp}:18443/mongo`
      }, database.writeOptions, callback)
    }, err => {
      if(err) {
        return next(err);
      }
      res.status(200).end();
    });

  });
});
