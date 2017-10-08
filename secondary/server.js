/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const bedrock = require('bedrock');
const brLedgerNode = require('bedrock-ledger-node');
const brRest = require('bedrock-rest');
const config = bedrock.config;
const cors = require('cors');
const fs = require('fs');
const ledger = require('./ledger');
const mongoExpress = require('mongo-express/lib/middleware');
const mongoExpressConfig = require('./mongo-express-config');
const os = require('os');
const path = require('path');

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

  app.get(routes.blocks, cors(), brRest.when.prefers.ld, (req, res, next) =>
    async.auto({
      ledgerNode: callback =>
        brLedgerNode.get(null, req.params.ledgerNodeId, callback),
      latest: ['ledgerNode', (results, callback) =>
        results.ledgerNode.blocks.getLatest(callback)]
    }, (err, results) => {
      if(err) {
        return next(err);
      }
      res.json(results.latest);
    }));

  app.post(routes.ledgers, brRest.when.prefers.ld, (req, res, next) =>
    async.auto({
      create: callback => ledger.create(req.body, callback)
    }, err => {
      if(err) {
        return next(err);
      }
      res.status(200).end();
    }));
});
