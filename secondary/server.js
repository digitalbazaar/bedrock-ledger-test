/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const bedrock = require('bedrock');
const brRest = require('bedrock-rest');
const config = bedrock.config;
const ledger = require('./ledger');
const mongoExpress = require('mongo-express/lib/middleware');
const mongoExpressConfig = require('./mongo-express-config');

bedrock.events.on('bedrock-express.configure.routes', app => {
  const routes = config['ledger-test'].routes;

  app.use(routes.mongoExpress, mongoExpress(mongoExpressConfig));

  app.post(routes.newLedger, brRest.when.prefers.ld, (req, res, next) => {
    async.auto({
      create: callback => ledger.create(req.body, callback)
    }, err => {
      if(err) {
        return next(err);
      }
      res.status(200).end();
    });
  });

});
