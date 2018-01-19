/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const bedrock = require('bedrock');
const brRest = require('bedrock-rest');
const config = bedrock.config;
const database = require('bedrock-mongodb');

bedrock.events.on('bedrock-express.configure.routes', app => {
  const routes = config['test-hub'].routes;

  app.get(routes.testHub, brRest.when.prefers.ld, brRest.linkedDataHandler({
    get: (req, res, callback) => database.collections.testHub.find()
      .toArray(callback)
  }));

  app.post(routes.testHub, (req, res, next) => {
    console.log(req.connection.remoteAddress, req.body);
    const record = {
      client: req.connection.remoteAddress,
      pass: req.body.pass,
      status: req.body.status,
      updated: Math.round(Date.now() / 1000), // seconds
      start: Date.now(),
    };
    async.auto({
      get: callback => database.collections.testHub.findOne(
        {client: record.client}, callback),
      update: ['get', (results, callback) => {
        if(results.get) {
          record.lastStart = results.get.start;
          record.lastEnd = Date.now();
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
