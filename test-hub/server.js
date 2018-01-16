/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const brRest = require('bedrock-rest');
const config = bedrock.config;
const database = require('bedrock-mongodb');

bedrock.events.on('bedrock-express.configure.routes', app => {
  const routes = config['ledger-test'].routes;

  app.get(routes.agents, brRest.when.prefers.ld, brRest.linkedDataHandler({
    get: (req, res, callback) => database.collections.ledgerAgent.find()
      .toArray(callback)
  }));

  app.post(routes.testHub, (req, res, next) => {
    console.log(req.connection.remoteAddress, req.body);
    const record = {
      client: req.connection.remoteAddress,
      pass: req.body.pass,
      status: req.body.status,
      updated: Date.now(),
    };
    database.collections.testHub.update(
      {client: record.client}, record, {upsert: true}, err => {
        if(err) {
          return next(err);
        }
        res.status(200).end();
      });
  });

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
