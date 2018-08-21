/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const bedrock = require('bedrock');
const brRest = require('bedrock-rest');
const {config} = bedrock;
const database = require('bedrock-mongodb');

bedrock.events.on('bedrock-express.configure.routes', app => {
  const routes = config['test-hub'].routes;

  app.get(routes.testHub, brRest.when.prefers.ld, brRest.linkedDataHandler({
    get: (req, res, callback) => database.collections.testHub.find()
      .toArray(callback)
  }));

  // delete all statuses, test that are still running will repopulate
  app.delete(routes.testHub, (req, res, next) => {
    database.collections.testHub.remove({}, err => {
      if(err) {
        return next(err);
      }
      res.status(204).end();
    });
  });

  app.post(routes.testHub, (req, res, next) => {
    console.verbose(req.connection.remoteAddress, req.body);
    const now = Date.now();
    const record = {
      client: req.connection.remoteAddress,
      commit: req.body.commit,
      pass: req.body.pass,
      status: req.body.status,
      updated: Math.round(now / 1000), // seconds
      start: now,
    };
    async.auto({
      get: callback => database.collections.testHub.findOne(
        {client: record.client}, callback),
      update: ['get', (results, callback) => {
        if(results.get) {
          record.lastStart = results.get.start;
          record.lastEnd = now;
        }
        database.collections.testHub.update(
          {client: record.client}, record, {upsert: true}, callback);
      }]
    }, err => {
      if(err) {
        return next(err);
      }
      res.status(200).end();
    });
  });
});
